import { logDebug } from "./debug.js";

const DEFAULT_OPTIONS = {
  minSalesInPeriod: 1,
  minSalesLast12M: 1,
  minSalesLifetime: 1,
  maxStaleMonths: 24,
  minReorderPoint: 0.5,
  ignoreHistorical: false,
  periodEnd: null,
};

function computePipelineStats(kpis, options) {
  const counters = {
    totalKpis: kpis.length,
    afterHasPeriodSales: 0,
    afterMinPeriodSales: 0,
    afterLast12M: 0,
    afterLifetime: 0,
    afterRecency: 0,
    afterRopFloor: 0,
    afterBelowMinStock: 0,
    finalSuggestions: 0,
  };

  kpis.forEach((kpi) => {
    const numbers = normalizeKpiNumbers(kpi);
    const hasPeriodSales = numbers.salesQtyPeriod >= 1;
    const meetsMinPeriod = numbers.salesQtyPeriod >= options.minSalesInPeriod;
    const hasLast12m = numbers.salesQtyLast12M >= options.minSalesLast12M;
    const hasLifetime = numbers.salesQtyLifetime >= options.minSalesLifetime;
    const recencyOk = options.ignoreHistorical || isRecentEnough(numbers.lastSaleDate, options);
    const hasRop = Number.isFinite(numbers.reorderPoint) && numbers.reorderPoint > options.minReorderPoint;
    const belowMinStock = hasRop && numbers.stockQty < numbers.reorderPoint;

    counters.afterHasPeriodSales += hasPeriodSales ? 1 : 0;
    counters.afterMinPeriodSales += meetsMinPeriod ? 1 : 0;
    counters.afterLast12M += hasLast12m ? 1 : 0;
    counters.afterLifetime += hasLifetime ? 1 : 0;
    counters.afterRecency += recencyOk ? 1 : 0;
    counters.afterRopFloor += hasRop ? 1 : 0;
    counters.afterBelowMinStock += belowMinStock ? 1 : 0;
  });

  counters.finalSuggestions = 0; // filled after filtering to mirror actual suggestions length
  return counters;
}

export function buildOrderSuggestions(kpis, options = {}) {
  const list = Array.isArray(kpis) ? kpis : [];
  const models = new Map();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const includedSkus = [];
  const pipelineStats = computePipelineStats(list, mergedOptions);

  list.forEach((kpi) => {
    if (!shouldSuggestOrder(kpi, mergedOptions)) return;

    const numbers = normalizeKpiNumbers(kpi);
    const orderQty = Math.ceil(numbers.reorderPoint - numbers.stockQty);
    if (orderQty < 1) return;
    includedSkus.push({ ...numbers, orderQty, kpi });

    const model = kpi.artikel || "Unbekannt";
    const lager = kpi.lager || "Unbekannt";
    const variant = kpi.variante || "Unbekannt";
    const last = kpi.leiste || "Unbekannt";
    const size = kpi.groesse || "Unbekannt";

    const key = `${model}::${lager}`;
    const entry = models.get(key) || {
      model,
      lager,
      variants: new Map(),
      totalOrderQty: 0,
      hasTopSeller: false,
    };

    const variantMap = entry.variants.get(variant) || new Map();
    const lastEntry =
      variantMap.get(last) || {
        sizes: new Map(),
        orderQty: 0,
        statusKey: kpi.statusKey,
        salesQty: numbers.salesQtyPeriod,
        stockQty: numbers.stockQty,
        reorderPoint: numbers.reorderPoint,
      };

    const sizeData =
      lastEntry.sizes.get(size) || {
        size,
        orderQty: 0,
        stockQty: numbers.stockQty,
        salesQty: numbers.salesQtyPeriod,
        avgDailySales: kpi.avgDailySales ?? 0,
        daysOfCover: kpi.daysOfCover ?? null,
        reorderPoint: numbers.reorderPoint,
        lastSaleDate: kpi.lastSaleDate ?? null,
        priority: kpi?.reason?.type || (kpi?.isUrgent ? "urgent" : kpi?.isLowStock ? "priority" : "monitor"),
      };
    sizeData.orderQty += orderQty;
    sizeData.stockQty = numbers.stockQty;
    sizeData.salesQty = numbers.salesQtyPeriod;
    sizeData.avgDailySales = kpi.avgDailySales ?? sizeData.avgDailySales;
    sizeData.daysOfCover = kpi.daysOfCover ?? sizeData.daysOfCover;
    sizeData.reorderPoint = numbers.reorderPoint;
    sizeData.lastSaleDate = kpi.lastSaleDate ?? sizeData.lastSaleDate;
    sizeData.priority = kpi?.reason?.type || sizeData.priority;
    lastEntry.sizes.set(size, sizeData);

    lastEntry.orderQty += orderQty;
    lastEntry.statusKey = kpi.statusKey || lastEntry.statusKey;
    lastEntry.salesQty = (lastEntry.salesQty || 0) + numbers.salesQtyPeriod;
    lastEntry.stockQty = Math.max(lastEntry.stockQty ?? 0, numbers.stockQty);
    lastEntry.reorderPoint = Math.max(lastEntry.reorderPoint ?? 0, numbers.reorderPoint);

    variantMap.set(last, lastEntry);
    entry.variants.set(variant, variantMap);
    entry.totalOrderQty += orderQty;
    entry.hasTopSeller = entry.hasTopSeller || kpi.isTopSeller === true;

    models.set(key, entry);
  });

  pipelineStats.finalSuggestions = includedSkus.length;

  logDebug("[OrderSuggestions Debug][Pipeline]", pipelineStats);

  logDebug("[OrderSuggestions Debug][Results]", {
    totalSuggestions: includedSkus.length,
    countSalesPeriodBelowMin: includedSkus.filter((item) => item.salesQtyPeriod < mergedOptions.minSalesInPeriod).length,
    countLast12MBelowMin: includedSkus.filter((item) => item.salesQtyLast12M < mergedOptions.minSalesLast12M).length,
    countLifetimeBelowMin: includedSkus.filter((item) => item.salesQtyLifetime < mergedOptions.minSalesLifetime).length,
    countRecencyFailed: includedSkus.filter((item) =>
      !mergedOptions.ignoreHistorical && !isRecentEnough(item.lastSaleDate, mergedOptions),
    ).length,
    countReorderPointTooLow: includedSkus.filter((item) => item.reorderPoint <= mergedOptions.minReorderPoint).length,
    countOrderQtyZeroOrNegative: includedSkus.filter((item) => !item.orderQty || item.orderQty < 1).length,
  });

  return Array.from(models.values()).map((model) => ({
    model: model.model,
    lager: model.lager,
    totalOrderQty: model.totalOrderQty,
    hasTopSeller: model.hasTopSeller,
    variants: Array.from(model.variants.entries()).map(([variant, lastMap]) => ({
      variant,
      leiste: Array.from(lastMap.entries()).map(([last, data]) => ({
        last,
        sizes: Array.from(data.sizes.values()).filter((s) => s.orderQty > 0),
        orderQty: data.orderQty,
        statusKey: data.statusKey,
      })),
    })),
  }));
}

export function shouldSuggestOrder(kpi, options = {}) {
  if (!kpi) return false;
  const { minSalesInPeriod, minSalesLast12M, minSalesLifetime, maxStaleMonths, minReorderPoint, ignoreHistorical, periodEnd } =
    { ...DEFAULT_OPTIONS, ...options };

  const numbers = normalizeKpiNumbers(kpi);
  const hasPeriodSales = numbers.salesQtyPeriod >= minSalesInPeriod;
  const hasLast12mSales = numbers.salesQtyLast12M >= minSalesLast12M;
  const hasLifetimeSales = numbers.salesQtyLifetime >= minSalesLifetime;
  const hasReorderPoint = Number.isFinite(numbers.reorderPoint) && numbers.reorderPoint > minReorderPoint;
  const isBelowMinStock = Number.isFinite(numbers.reorderPoint) && numbers.stockQty < numbers.reorderPoint;
  const recencyOk = ignoreHistorical || isRecentEnough(numbers.lastSaleDate, { periodEnd, maxStaleMonths });

  const coreOk = hasReorderPoint && isBelowMinStock;
  const demandOk = hasPeriodSales || hasLast12mSales;
  const historyOk = hasLifetimeSales && recencyOk;

  if (!(coreOk && demandOk && historyOk)) return false;

  if (ignoreHistorical) {
    return true;
  }

  return true;
}

function normalizeKpiNumbers(kpi) {
  const stockQty = toNonNegativeNumber(kpi.stockQty ?? kpi.bestand);
  const reorderPoint = toFiniteNumber(kpi.reorderPoint);
  const salesQtyPeriod = toNonNegativeNumber(kpi.salesQtyPeriod);
  const salesQtyLast12M = toNonNegativeNumber(kpi.salesQtyLast12M);
  const salesQtyLifetime = toNonNegativeNumber(kpi.salesQtyLifetime ?? kpi.verkaufteMengeTotal ?? kpi.salesQty);
  return {
    stockQty,
    reorderPoint,
    salesQtyPeriod,
    salesQtyLast12M,
    salesQtyLifetime,
    lastSaleDate: toValidDate(kpi.lastSaleDate),
  };
}

function toNonNegativeNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num < 0 ? 0 : num;
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toValidDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isRecentEnough(lastSaleDate, options) {
  const { periodEnd, maxStaleMonths } = options;
  const date = toValidDate(lastSaleDate);
  if (!date) return false;
  const windowEnd = toValidDate(periodEnd) || new Date();
  const windowStart = new Date(windowEnd.getTime());
  windowStart.setMonth(windowStart.getMonth() - maxStaleMonths);
  return date >= windowStart;
}
