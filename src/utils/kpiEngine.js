import { buildSkuKey, normalizeKeyPart, normalizeNumber, normalizeText } from "./normalization.js";

const LEAD_TIME_DAYS = 14;
const SAFETY_FACTOR = 0.5;
const REVIEW_CYCLE_DAYS = 7;
const MIN_PERIOD_DAYS = 30;
const TOP_SELLER_LIMIT = 100;
const CRITICAL_QTY_PER_SIZE = 2;
const URGENT_DOC_THRESHOLD = 5;
const STALE_MONTHS = 18;
const MIN_REORDER_POINT_THRESHOLD = 1;
const DEMAND_LOOKBACK_DAYS = 30;

// KPI engine: merges inventory and sales data per SKU and derives core metrics.
// Optional daysInPeriodOverride allows a global Zeitraum-Selector to control the window
// instead of deriving the period from the first/last sale dates per SKU.
export function calculateKpis({ inventory, sales, allSales, daysInPeriodOverride, periodEnd }) {
  const inventoryList = Array.isArray(inventory) ? inventory : [];
  const salesList = Array.isArray(sales) ? sales : [];

  const salesBySku = groupSalesBySku(salesList);
  const historicalSalesBySku = buildHistoricalSalesBySku(allSales, periodEnd);
  const demandWindow = buildDemandWindow(periodEnd, allSales);
  const demandSalesBySku = groupSalesBySkuWithin(allSales, demandWindow.start, demandWindow.end);

  const existingSkus = new Set();

  const kpis = inventoryList.map((item) => {
    const artikel = normalizeKeyPart(item?.artikel);
    const variante = normalizeKeyPart(item?.variante);
    const leiste = normalizeKeyPart(item?.leiste);
    const groesse = normalizeKeyPart(item?.groesse);
    const qualitaet = normalizeKeyPart(item?.qualitaet);
    const lager = normalizeKeyPart(item?.lager);
    const sku = normalizeText(item?.sku) || buildSkuKey({ artikel, variante, leiste, groesse, qualitaet, lager });
    existingSkus.add(sku);
    const kategorie = normalizeText(item?.kategorie);
    const policy = normalizeText(item?.policy) || "normal";
    const stockQty = normalizeNumber(item?.bestand) ?? 0;

    const salesInfo = salesBySku.get(sku) || { salesQty: 0, firstDate: null, lastDate: null };
    const demandInfo = demandSalesBySku.get(sku) || { salesQty: 0 };
    return buildKpiRecord({
      sku,
      artikel,
      variante,
      leiste,
      groesse,
      qualitaet,
      lager,
      kategorie,
      stockQty,
      policy,
      salesInfo,
      demandInfo,
      historicalInfo: historicalSalesBySku.get(sku),
      daysInPeriodOverride,
      demandDaysOverride: demandWindow.daysInPeriod,
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
    const qualitaet = salesInfo.qualitaet || "";
    const lager = salesInfo.lager || "";
    const demandInfo = demandSalesBySku.get(sku) || { salesQty: 0 };
    kpis.push(
      buildKpiRecord({
        sku,
        artikel,
        variante,
        leiste,
        groesse,
        qualitaet,
        lager,
        kategorie: "",
        stockQty: 0,
        policy: "normal",
        salesInfo,
        demandInfo,
        historicalInfo: historicalSalesBySku.get(sku),
        daysInPeriodOverride,
        demandDaysOverride: demandWindow.daysInPeriod,
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
  qualitaet,
  lager,
  kategorie,
  stockQty,
  salesInfo,
  demandInfo,
  policy = "normal",
  historicalInfo,
  daysInPeriodOverride,
  demandDaysOverride,
  periodEnd,
}) {
  const salesQty = salesInfo.salesQty ?? 0;
  const daysInPeriod = Math.max(
    MIN_PERIOD_DAYS,
    daysInPeriodOverride ?? computeDaysInPeriod(salesInfo.firstDate, salesInfo.lastDate),
  );
  const demandDays = Math.max(1, demandDaysOverride ?? DEMAND_LOOKBACK_DAYS);
  const salesQtyDemand = demandInfo?.salesQty ?? 0;
  const avgDailySales = salesQtyDemand > 0 ? salesQtyDemand / demandDays : 0;
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

  const historical = historicalInfo || { salesQtyLast12M: 0, salesQtyLast24M: 0, lastSaleDate: null, salesQtyLifetime: 0 };
  const lastSaleDate = pickLater(salesInfo.lastDate, historical.lastSaleDate) || null;
  const salesQtyLast12M = Number.isFinite(historical.salesQtyLast12M) ? historical.salesQtyLast12M : 0;
  const salesQtyLast24M = Number.isFinite(historical.salesQtyLast24M) ? historical.salesQtyLast24M : 0;
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
    qualitaet,
    lager,
    kategorie,
    policy,
    bestand: stockQty,
    verkaufteMengeTotal: salesQty,
    salesQtyDemand,
    stockQty,
    daysInPeriod,
    demandDays,
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
    salesQtyLast24M,
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
    const artikel = normalizeKeyPart(sale?.artikel);
    const variante = normalizeKeyPart(sale?.variante);
    const leiste = normalizeKeyPart(sale?.leiste);
    const groesse = normalizeKeyPart(sale?.groesse);
    const qualitaet = normalizeKeyPart(sale?.qualitaet);
    const lager = normalizeKeyPart(sale?.lager);
    const sku = normalizeText(sale?.sku) || buildSkuKey({ artikel, variante, leiste, groesse, qualitaet, lager });
    if (!sku || !artikel || !variante || !leiste || !groesse || !lager) continue;

    const menge = normalizeNumber(sale?.menge);
    if (menge === null) continue;

    const datum = toValidDate(sale?.datum);
    const current = map.get(sku) || {
      salesQty: 0,
      firstDate: null,
      lastDate: null,
      artikel,
      variante,
      leiste,
      groesse,
      qualitaet,
      lager,
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
  const windowStart12 = new Date(windowEnd.getTime());
  windowStart12.setMonth(windowStart12.getMonth() - 12);
  const windowStart24 = new Date(windowEnd.getTime());
  windowStart24.setMonth(windowStart24.getMonth() - 24);

  for (const sale of allSales) {
    const artikel = normalizeKeyPart(sale?.artikel);
    const variante = normalizeKeyPart(sale?.variante);
    const leiste = normalizeKeyPart(sale?.leiste);
    const groesse = normalizeKeyPart(sale?.groesse);
    const qualitaet = normalizeKeyPart(sale?.qualitaet);
    const lager = normalizeKeyPart(sale?.lager);
    const sku = normalizeText(sale?.sku) || buildSkuKey({ artikel, variante, leiste, groesse, qualitaet, lager });
    if (!sku || !artikel || !variante || !leiste || !groesse || !lager) continue;

    const menge = normalizeNumber(sale?.menge);
    if (menge === null) continue;

    const datum = toValidDate(sale?.datum);
    const current =
      map.get(sku) || { salesQtyLast12M: 0, salesQtyLast24M: 0, lastSaleDate: null, salesQtyLifetime: 0 };

    let { salesQtyLast12M, salesQtyLast24M, lastSaleDate, salesQtyLifetime } = current;
    salesQtyLifetime += menge;
    if (datum) {
      lastSaleDate = pickLater(lastSaleDate, datum);
      if (datum >= windowStart12 && datum <= windowEnd) {
        salesQtyLast12M += menge;
      }
      if (datum >= windowStart24 && datum <= windowEnd) {
        salesQtyLast24M += menge;
      }
    }

    map.set(sku, { salesQtyLast12M, salesQtyLast24M, lastSaleDate, salesQtyLifetime });
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

function buildDemandWindow(periodEnd, allSales) {
  const end = periodEnd instanceof Date && !Number.isNaN(periodEnd.getTime()) ? periodEnd : new Date();
  const start = new Date(end.getTime());
  start.setDate(start.getDate() - (DEMAND_LOOKBACK_DAYS - 1));

  // clamp to earliest sale date if available
  let earliest = null;
  if (Array.isArray(allSales)) {
    for (const sale of allSales) {
      const d = toValidDate(sale?.datum);
      if (!d) continue;
      if (!earliest || d < earliest) earliest = d;
    }
  }
  const boundedStart = earliest && start < earliest ? earliest : start;
  return {
    start: boundedStart,
    end,
    daysInPeriod: computeDaysInPeriod(boundedStart, end),
  };
}

function groupSalesBySkuWithin(salesList, windowStart, windowEnd) {
  const map = new Map();
  if (!Array.isArray(salesList)) return map;
  const startTime = windowStart instanceof Date ? windowStart.getTime() : null;
  const endTime = windowEnd instanceof Date ? windowEnd.getTime() : null;

  for (const sale of salesList) {
    const datum = toValidDate(sale?.datum);
    if (!datum) continue;
    const t = datum.getTime();
    if (startTime !== null && t < startTime) continue;
    if (endTime !== null && t > endTime) continue;

    const artikel = normalizeKeyPart(sale?.artikel);
    const variante = normalizeKeyPart(sale?.variante);
    const leiste = normalizeKeyPart(sale?.leiste);
    const groesse = normalizeKeyPart(sale?.groesse);
    const qualitaet = normalizeKeyPart(sale?.qualitaet);
    const lager = normalizeKeyPart(sale?.lager);
    const sku = normalizeText(sale?.sku) || buildSkuKey({ artikel, variante, leiste, groesse, qualitaet, lager });
    if (!sku || !artikel || !variante || !leiste || !groesse || !lager) continue;

    const menge = normalizeNumber(sale?.menge);
    if (menge === null) continue;

    const current = map.get(sku) || { salesQty: 0 };
    map.set(sku, { ...current, salesQty: current.salesQty + menge });
  }

  return map;
}
