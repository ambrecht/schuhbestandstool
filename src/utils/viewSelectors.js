function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function deriveStockSignal(stockQty, reorderPoint) {
  const stock = toNumber(stockQty);
  const min = Math.max(0, toNumber(reorderPoint));
  if (stock === 0) return { key: "OOS", label: "Ausverkauft", tone: "red" };
  if (stock < min) return { key: "LOW", label: "Bestand knapp", tone: "amber" };
  return { key: "OK", label: "Bestand ok", tone: "green" };
}

export function buildTopSellerRows(kpis) {
  const list = (Array.isArray(kpis) ? kpis : [])
    .filter((kpi) => toNumber(kpi?.verkaufteMengeTotal) > 0)
    .sort((a, b) => toNumber(b?.verkaufteMengeTotal) - toNumber(a?.verkaufteMengeTotal))
    .slice(0, 100);

  return list.map((kpi, idx) => {
    const stockSignal = deriveStockSignal(kpi?.bestand, kpi?.reorderPoint);
    return {
      rank: idx + 1,
      sku: kpi?.sku,
      model: kpi?.artikel || "Unbekannt",
      variant: kpi?.variante || "-",
      last: kpi?.leiste || "-",
      size: kpi?.groesse || "-",
      salesQty: toNumber(kpi?.verkaufteMengeTotal),
      avgMonthlySales: toNumber(kpi?.avgDailySales) * 30,
      stockQty: toNumber(kpi?.bestand),
      reorderPoint: toNumber(kpi?.reorderPoint),
      status: stockSignal,
      kpi,
    };
  });
}

export function groupTopSellersByModel(rows, modelInsights) {
  const missingMap = modelInsights?.missingSizes || {};
  const grouped = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = row?.model || "Unbekannt";
    const entry = grouped.get(key) || {
      model: key,
      modelSales: 0,
      modelAvgMonthlySales: 0,
      modelStock: 0,
      modelMinStock: 0,
      missingWithDemand: 0,
      lowCount: 0,
    };

    entry.modelSales += toNumber(row?.salesQty);
    entry.modelAvgMonthlySales += toNumber(row?.avgMonthlySales);
    entry.modelStock += toNumber(row?.stockQty);
    entry.modelMinStock += toNumber(row?.reorderPoint);
    if (row?.status?.key === "OOS") entry.missingWithDemand += 1;
    if (row?.status?.key === "LOW") entry.lowCount += 1;

    grouped.set(key, entry);
  });

  for (const [model, missingList] of Object.entries(missingMap || {})) {
    const entry = grouped.get(model);
    if (!entry) continue;
    entry.missingWithDemand += Array.isArray(missingList) ? missingList.length : 0;
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.modelSales - a.modelSales)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      gapSummary: buildGapSummary(item),
      status: deriveStockSignal(item.modelStock, item.modelMinStock),
    }));
}

export function buildSizeAndLastAggregations(kpis) {
  const list = Array.isArray(kpis) ? kpis : [];
  const bySize = aggregateByKey(list, "groesse");
  const byLast = aggregateByKey(list, "leiste");

  return {
    sizes: toSortedTop(bySize),
    lasts: toSortedTop(byLast),
  };
}

export function buildColorAggregations(kpis, modelInsights) {
  const list = Array.isArray(kpis) ? kpis : [];
  const missingByVariant = collectMissingModelsByVariant(modelInsights);
  const map = new Map();

  list.forEach((kpi) => {
    const variant = kpi?.variante || "Unbekannt";
    const entry = map.get(variant) || {
      variant,
      salesQty: 0,
      avgMonthlySales: 0,
      stockQty: 0,
      reorderPoint: 0,
      modelsWithMissing: missingByVariant.get(variant) || 0,
    };

    entry.salesQty += toNumber(kpi?.verkaufteMengeTotal);
    entry.avgMonthlySales += toNumber(kpi?.avgDailySales) * 30;
    entry.stockQty += toNumber(kpi?.bestand);
    entry.reorderPoint += toNumber(kpi?.reorderPoint);
    map.set(variant, entry);
  });

  return Array.from(map.values())
    .sort((a, b) => b.salesQty - a.salesQty)
    .slice(0, 20)
    .map((item) => ({
      ...item,
      status: deriveStockSignal(item.stockQty, item.reorderPoint),
    }));
}

export function collectTopSellerSkuSet(kpis) {
  const set = new Set();
  (Array.isArray(kpis) ? kpis : []).forEach((kpi) => {
    if (kpi?.isTopSeller && kpi?.sku) {
      set.add(kpi.sku);
    }
  });
  return set;
}

export function buildModelList(insights) {
  const grouped = insights?.grouped || {};
  const models = Object.values(grouped).map((model) => ({
    model: model.modelName,
    totalSales: toNumber(model.totalSales),
    totalStock: toNumber(model.totalStock),
    topSizes: model.modelTopSizes || [],
    topVariants: model.modelTopVariants || [],
    gapSummary: buildGapSummary({
      missingWithDemand: countStatuses(model, ["MISSING_WITH_DEMAND"]),
      lowCount: countStatuses(model, ["URGENT_LOW_STOCK", "LOW_STOCK"]),
    }),
    hasProblems: hasProblemStatus(model),
  }));

  return models.sort((a, b) => b.totalSales - a.totalSales);
}

function aggregateByKey(list, key) {
  const map = new Map();
  list.forEach((kpi) => {
    const groupKey = kpi?.[key] || "Unbekannt";
    const entry = map.get(groupKey) || {
      key: groupKey,
      salesQty: 0,
      avgMonthlySales: 0,
      stockQty: 0,
      reorderPoint: 0,
    };

    entry.salesQty += toNumber(kpi?.verkaufteMengeTotal);
    entry.avgMonthlySales += toNumber(kpi?.avgDailySales) * 30;
    entry.stockQty += toNumber(kpi?.bestand);
    entry.reorderPoint += toNumber(kpi?.reorderPoint);
    map.set(groupKey, entry);
  });
  return map;
}

function toSortedTop(map) {
  return Array.from(map.values())
    .sort((a, b) => b.salesQty - a.salesQty)
    .slice(0, 20)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      status: deriveStockSignal(item.stockQty, item.reorderPoint),
    }));
}

function buildGapSummary(entry) {
  const missing = entry?.missingWithDemand || 0;
  const low = entry?.lowCount || 0;
  if (!missing && !low) return "Keine Engpaesse sichtbar";
  if (missing && low) return `${missing} Groessen fehlen (mit Nachfrage), ${low} knapp`;
  if (missing) return `${missing} Groessen fehlen (mit Nachfrage)`;
  return `${low} Groessen sind knapp`;
}

function collectMissingModelsByVariant(modelInsights) {
  const map = new Map();
  const grouped = modelInsights?.grouped || {};

  for (const [modelName, model] of Object.entries(grouped)) {
    for (const [variantName, variant] of Object.entries(model.variants || {})) {
      let hasMissing = false;
      for (const leiste of Object.values(variant.leiste || {})) {
        for (const cell of Object.values(leiste.sizes || {})) {
          if (cell?.status === "MISSING_WITH_DEMAND") {
            hasMissing = true;
            break;
          }
        }
        if (hasMissing) break;
      }
      if (hasMissing) {
        const current = map.get(variantName) || new Set();
        current.add(modelName);
        map.set(variantName, current);
      }
    }
  }

  const result = new Map();
  for (const [variant, models] of map.entries()) {
    result.set(variant, models.size);
  }
  return result;
}

function countStatuses(model, statuses) {
  if (!model) return 0;
  let count = 0;
  for (const variant of Object.values(model.variants || {})) {
    for (const leiste of Object.values(variant.leiste || {})) {
      for (const cell of Object.values(leiste.sizes || {})) {
        if (statuses.includes(cell?.status)) count += 1;
      }
    }
  }
  return count;
}

function hasProblemStatus(model) {
  return countStatuses(model, ["MISSING_WITH_DEMAND", "URGENT_LOW_STOCK"]) > 0;
}
