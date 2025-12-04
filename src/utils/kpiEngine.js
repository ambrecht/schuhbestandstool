import { buildSku, normalizeNumber, normalizeText } from "./normalization.js";

const LEAD_TIME_DAYS = 14;
const SAFETY_FACTOR = 0.5;
const REVIEW_CYCLE_DAYS = 7;
const MIN_PERIOD_DAYS = 30;
const TOP_SELLER_LIMIT = 100;
const CRITICAL_QTY_PER_SIZE = 2;
const URGENT_DOC_THRESHOLD = 5;
const STALE_MONTHS = 18;
const MIN_REORDER_POINT_THRESHOLD = 0.5;

// KPI engine: merges inventory and sales data per SKU and derives core metrics.
// Optional daysInPeriodOverride allows a global Zeitraum-Selector to control the window
// instead of deriving the period from the first/last sale dates per SKU.
export function calculateKpis({ inventory, sales, allSales, daysInPeriodOverride, periodEnd }) {
  const inventoryList = Array.isArray(inventory) ? inventory : [];
  const salesList = Array.isArray(sales) ? sales : [];

  const salesBySku = groupSalesBySku(salesList);
  const historicalSalesBySku = buildHistoricalSalesBySku(allSales, periodEnd);

  const existingSkus = new Set();

  const kpis = inventoryList.map((item) => {
    const artikel = normalizeText(item?.artikel);
    const variante = normalizeText(item?.variante);
    const leiste = normalizeText(item?.leiste);
    const groesse = normalizeText(item?.groesse);
    const sku = normalizeText(item?.sku) || buildSku({ artikel, variante, leiste, groesse });
    existingSkus.add(sku);
    const kategorie = normalizeText(item?.kategorie);
    const policy = normalizeText(item?.policy) || "normal";
    const stockQty = normalizeNumber(item?.bestand) ?? 0;

    const salesInfo = salesBySku.get(sku) || { salesQty: 0, firstDate: null, lastDate: null };
    return buildKpiRecord({
      sku,
      artikel,
      variante,
      leiste,
      groesse,
      kategorie,
      stockQty,
      policy,
      salesInfo,
      historicalInfo: historicalSalesBySku.get(sku),
      daysInPeriodOverride,
      periodEnd,
    });
  });

  // Add SKUs that only exist in sales (OOS ohne Bestandszeile)
  for (const [sku, salesInfo] of salesBySku.entries()) {
    if (existingSkus.has(sku)) continue;
    const artikel = salesInfo.artikel || "";
    const variante = salesInfo.variante || "";
    const leiste = salesInfo.leiste || "";
    const groesse = salesInfo.groesse || "";
    kpis.push(
      buildKpiRecord({
        sku,
        artikel,
        variante,
        leiste,
        groesse,
        kategorie: "",
        stockQty: 0,
        policy: "normal",
        salesInfo,
        historicalInfo: historicalSalesBySku.get(sku),
        daysInPeriodOverride,
        periodEnd,
      }),
    );
  }

  return applyTopSellerRanking(kpis);
}

function buildKpiRecord({
  sku,
  artikel,
  variante,
  leiste,
  groesse,
  kategorie,
  stockQty,
  salesInfo,
  policy = "normal",
  historicalInfo,
  daysInPeriodOverride,
  periodEnd,
}) {
  const salesQty = salesInfo.salesQty ?? 0;
  const daysInPeriod = Math.max(
    MIN_PERIOD_DAYS,
    daysInPeriodOverride ?? computeDaysInPeriod(salesInfo.firstDate, salesInfo.lastDate),
  );
  const avgDailySales = salesQty > 0 ? salesQty / daysInPeriod : 0;
  const avgMonthlySales = avgDailySales * 30;

  const denominator = salesQty + stockQty;
  const sellThrough = denominator > 0 ? salesQty / denominator : null;
  const daysOfCover = avgDailySales > 0 ? stockQty / avgDailySales : null;

  const avgInventoryQty = (salesQty + stockQty) / 2;
  const turns = avgInventoryQty > 0 ? salesQty / avgInventoryQty : null;

  const workingReserve = avgDailySales * LEAD_TIME_DAYS;
  const safetyStock = SAFETY_FACTOR * workingReserve;
  const reorderPointRaw = workingReserve + safetyStock;
  const reorderPoint = reorderPointRaw < MIN_REORDER_POINT_THRESHOLD ? 0 : reorderPointRaw;
  const maxStock = reorderPoint + avgDailySales * REVIEW_CYCLE_DAYS;
  const needsReorder = stockQty <= reorderPoint;

  const isOOS = stockQty === 0;
  const isCriticalQty = stockQty <= CRITICAL_QTY_PER_SIZE;
  const isLowStock = daysOfCover !== null && daysOfCover < 7;
  const isUrgent = (daysOfCover !== null && daysOfCover < URGENT_DOC_THRESHOLD) || isCriticalQty;
  const isSlowMover = avgDailySales < 0.1 && stockQty > 0;

  const historical = historicalInfo || { salesQtyLast12M: 0, lastSaleDate: null, salesQtyLifetime: 0 };
  const lastSaleDate = pickLater(salesInfo.lastDate, historical.lastSaleDate) || null;
  const salesQtyLast12M = Number.isFinite(historical.salesQtyLast12M) ? historical.salesQtyLast12M : 0;
  const salesQtyLifetime = Number.isFinite(historical.salesQtyLifetime) ? historical.salesQtyLifetime : 0;
  const staleThreshold = buildStaleThreshold(periodEnd || new Date(), STALE_MONTHS);
  const isHistoricalSku =
    stockQty === 0 && salesQty === 0 && lastSaleDate instanceof Date && lastSaleDate < staleThreshold;
  const isRelevantForMatrix =
    stockQty > 0 ||
    salesQty > 0 ||
    (lastSaleDate instanceof Date && lastSaleDate >= staleThreshold) ||
    needsReorder;
  const statusKey = deriveStatusKey({
    salesQtyPeriod: salesQty,
    stockQty,
    needsReorder,
    isUrgent,
    isLowStock,
    isOOS,
    isHistoricalSku,
  });

  return {
    sku,
    artikel,
    variante,
    leiste,
    groesse,
    kategorie,
    policy,
    bestand: stockQty,
    verkaufteMengeTotal: salesQty,
    stockQty,
    daysInPeriod,
    avgDailySales,
    avgMonthlySales,
    sellThrough,
    daysOfCover,
    turns,
    workingReserve,
    safetyStock,
    reorderPoint,
    maxStock,
    needsReorder,
    lastSaleDate,
    salesQtyPeriod: salesQty,
    salesQtyLast12M,
    salesQtyLifetime,
    isHistoricalSku,
    isRelevantForMatrix,
    statusKey,
    isOOS,
    isCriticalQty,
    isLowStock,
    isUrgent,
    isSlowMover,
  };
}

function groupSalesBySku(salesList) {
  const map = new Map();

  for (const sale of salesList) {
    const sku = normalizeText(sale?.sku);
    if (!sku) continue;

    const menge = normalizeNumber(sale?.menge);
    if (menge === null) continue;

    const datum = toValidDate(sale?.datum);
    const current = map.get(sku) || {
      salesQty: 0,
      firstDate: null,
      lastDate: null,
      artikel: normalizeText(sale?.artikel),
      variante: normalizeText(sale?.variante),
      leiste: normalizeText(sale?.leiste),
      groesse: normalizeText(sale?.groesse),
    };

    const salesQty = current.salesQty + menge;
    const firstDate = pickEarlier(current.firstDate, datum);
    const lastDate = pickLater(current.lastDate, datum);

    map.set(sku, {
      ...current,
      salesQty,
      firstDate,
      lastDate,
    });
  }

  return map;
}

function buildHistoricalSalesBySku(allSales, periodEnd) {
  const map = new Map();
  if (!Array.isArray(allSales)) return map;

  const windowEnd = periodEnd instanceof Date && !Number.isNaN(periodEnd.getTime()) ? periodEnd : new Date();
  const windowStart = new Date(windowEnd.getTime());
  windowStart.setMonth(windowStart.getMonth() - 12);

  for (const sale of allSales) {
    const sku = normalizeText(sale?.sku);
    if (!sku) continue;

    const menge = normalizeNumber(sale?.menge);
    if (menge === null) continue;

    const datum = toValidDate(sale?.datum);
    const current = map.get(sku) || { salesQtyLast12M: 0, lastSaleDate: null, salesQtyLifetime: 0 };

    let { salesQtyLast12M, lastSaleDate, salesQtyLifetime } = current;
    salesQtyLifetime += menge;
    if (datum) {
      lastSaleDate = pickLater(lastSaleDate, datum);
      if (datum >= windowStart && datum <= windowEnd) {
        salesQtyLast12M += menge;
      }
    }

    map.set(sku, { salesQtyLast12M, lastSaleDate, salesQtyLifetime });
  }

  return map;
}

function computeDaysInPeriod(startDate, endDate) {
  if (startDate && endDate) {
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    return Math.max(MIN_PERIOD_DAYS, days);
  }
  return MIN_PERIOD_DAYS;
}

function toValidDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pickEarlier(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return a.getTime() <= b.getTime() ? a : b;
}

function pickLater(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return a.getTime() >= b.getTime() ? a : b;
}

function applyTopSellerRanking(kpis) {
  const sorted = kpis
    .slice()
    .sort(
      (a, b) =>
        (b?.verkaufteMengeTotal ?? 0) - (a?.verkaufteMengeTotal ?? 0) ||
        (b?.sellThrough ?? 0) - (a?.sellThrough ?? 0),
    );

  const rankBySku = new Map();
  sorted.forEach((kpi, index) => {
    if (!kpi?.sku) return;
    rankBySku.set(kpi.sku, index + 1);
  });

  return kpis.map((kpi) => {
    const rankOverall = rankBySku.get(kpi.sku) ?? null;
    const isTopSeller = rankOverall !== null && rankOverall <= TOP_SELLER_LIMIT;
    const isTopSellerOOS = isTopSeller && kpi.isOOS;
    const isTopSellerLowStock = isTopSeller && kpi.isLowStock;
    const isTopSellerUrgent = isTopSeller && (kpi.isUrgent || kpi.isOOS);

    return {
      ...kpi,
      rankOverall,
      isTopSeller,
      isTopSellerOOS,
      isTopSellerLowStock,
      isTopSellerUrgent,
      isRelevantForMatrix: kpi.isRelevantForMatrix || isTopSeller,
      statusKey: kpi.statusKey === "REORDER" ? kpi.statusKey : kpi.statusKey,
    };
  });
}

function buildStaleThreshold(periodEnd, monthsBack) {
  const base = periodEnd instanceof Date && !Number.isNaN(periodEnd.getTime()) ? periodEnd : new Date();
  const threshold = new Date(base.getTime());
  threshold.setMonth(threshold.getMonth() - monthsBack);
  return threshold;
}

function deriveStatusKey({ salesQtyPeriod, stockQty, needsReorder, isUrgent, isLowStock, isOOS, isHistoricalSku }) {
  if (salesQtyPeriod > 0 && stockQty === 0) return "REORDER";
  if (isOOS && salesQtyPeriod === 0) return "OOS_INACTIVE";
  if (needsReorder || isUrgent) return "LOW";
  if (isLowStock) return "LOW";
  if (isHistoricalSku) return "OOS_INACTIVE";
  return "OK";
}
