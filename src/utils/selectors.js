export function getTopSellerOosSkus(kpis) {
  return (Array.isArray(kpis) ? kpis : [])
    .filter((kpi) => kpi?.isTopSeller && kpi?.isOOS)
    .sort(
      (a, b) =>
        (b?.priorityScore ?? 0) - (a?.priorityScore ?? 0) ||
        (b?.verkaufteMengeTotal ?? 0) - (a?.verkaufteMengeTotal ?? 0),
    );
}

export function getTopSellerOosRecommendations(recommendations) {
  return (Array.isArray(recommendations) ? recommendations : []).filter(
    (r) => r?.reason?.details?.topSellerOOS === true,
  );
}

export function getCriticalSizes(kpis, { onlyTopSeller = false } = {}) {
  const list = Array.isArray(kpis) ? kpis : [];

  return list
    .filter((kpi) => {
      if (onlyTopSeller && !kpi?.isTopSeller) return false;
      return kpi?.isUrgent === true || kpi?.isCriticalQty === true;
    })
    .sort((a, b) => {
      if (a?.isTopSeller !== b?.isTopSeller) {
        return a?.isTopSeller ? -1 : 1;
      }
      return (a?.bestand ?? Number.POSITIVE_INFINITY) - (b?.bestand ?? Number.POSITIVE_INFINITY);
    });
}

export function buildTopSellerModelRows(kpis, modelInsights) {
  const missing = modelInsights?.missingSizes || {};
  const rows = [];
  const byModel = new Map();

  (Array.isArray(kpis) ? kpis : []).forEach((kpi) => {
    if (!kpi?.isTopSeller) return;
    const artikel = kpi.artikel || "Unbekannt";
    const entry = byModel.get(artikel) || {
      model: artikel,
      totalSalesModel: 0,
      totalStockModel: 0,
      oosCount: 0,
      missingHighDemand: 0,
      topRank: Number.POSITIVE_INFINITY,
    };
    entry.totalSalesModel += Number(kpi.verkaufteMengeTotal) || 0;
    entry.totalStockModel += Number(kpi.bestand) || 0;
    if (kpi.isOOS) entry.oosCount += 1;
    entry.topRank = Math.min(entry.topRank, kpi.rankOverall ?? Number.POSITIVE_INFINITY);
    byModel.set(artikel, entry);
  });

  for (const [artikel, list] of Object.entries(missing)) {
    const entry = byModel.get(artikel);
    if (!entry) continue;
    entry.missingHighDemand = Array.isArray(list) ? list.length : 0;
  }

  byModel.forEach((value) => rows.push(value));

  return rows
    .filter((m) => Number.isFinite(m.topRank))
    .sort((a, b) => (a.topRank ?? Number.POSITIVE_INFINITY) - (b.topRank ?? Number.POSITIVE_INFINITY));
}

const ACCESSORY_KEYWORDS = [
  "schuhl\u00f6ffel",
  "schuhloeffel",
  "schuhl\u00f6fel",
  "schuhband",
  "schuhb\u00e4nder",
  "schuhbaender",
  "schuhsenkel",
  "shoelace",
  "laces",
];

export function filterNonAccessories(kpis) {
  const list = Array.isArray(kpis) ? kpis : [];
  return list.filter((kpi) => !isAccessory(kpi?.artikel));
}

function isAccessory(artikel) {
  const name = String(artikel || "").toLowerCase();
  return ACCESSORY_KEYWORDS.some((kw) => name.includes(kw));
}


export function getTodayReorders(recommendations) {
  const list = Array.isArray(recommendations) ? recommendations : [];
  const urgent = list.filter((r) => r?.reason?.type === 'urgent' || r?.type === 'urgent');
  const priority = list.filter((r) => r?.reason?.type === 'priority' || r?.type === 'priority');
  const sortFn = (a, b) => (b?.priorityScore ?? 0) - (a?.priorityScore ?? 0);
  return {
    urgent: urgent.slice().sort(sortFn),
    priority: priority.slice().sort(sortFn),
  };
}

export function getTopSellerMonitor(kpis) {
  const list = Array.isArray(kpis) ? kpis : [];
  const top = list.filter((k) => k?.isTopSeller);
  const oos = top.filter((k) => k?.isOOS).sort((a, b) => (b?.verkaufteMengeTotal ?? 0) - (a?.verkaufteMengeTotal ?? 0));
  const low = top
    .filter((k) => !k?.isOOS && k?.isLowStock)
    .sort((a, b) => (b?.verkaufteMengeTotal ?? 0) - (a?.verkaufteMengeTotal ?? 0));
  return { oos, low };
}

export function getModelsWithGaps(modelInsights) {
  const missing = modelInsights?.missingSizes || {};
  const grouped = modelInsights?.grouped || {};
  const rows = [];
  for (const [model, list] of Object.entries(missing)) {
    const entry = grouped[model];
    const totalSales = entry?.totalSales ?? 0;
    const totalStock = entry?.totalStock ?? 0;
    const missingCount = Array.isArray(list) ? list.length : 0;
    const oosSizes = collectOosCount(entry);
    rows.push({ model, totalSales, totalStock, missingCount, oosSizes });
  }
  return rows.sort((a, b) => (b.totalSales ?? 0) - (a.totalSales ?? 0));
}

function collectOosCount(model) {
  if (!model) return 0;
  let count = 0;
  for (const variant of Object.values(model.variants || {})) {
    for (const leiste of Object.values(variant.leiste || {})) {
      for (const kpi of Object.values(leiste.sizes || {})) {
        if (kpi?.isOOS) count += 1;
      }
    }
  }
  return count;
}
