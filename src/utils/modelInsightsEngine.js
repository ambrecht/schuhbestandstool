const DEMAND_THRESHOLD = 3;

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function groupByModel(kpis) {
  const grouped = {};
  const list = ensureArray(kpis);

  for (const kpi of list) {
    if (!kpi) continue;
    const artikel = kpi.artikel || "Unbekannt";
    const variante = kpi.variante || "Unbekannt";
    const leiste = kpi.leiste || "Unbekannt";
    const groesse = kpi.groesse || "Unbekannt";

    const sales = Number(kpi?.verkaufteMengeTotal) || 0;
    const stock = Number(kpi?.bestand) || 0;
    const doc = Number.isFinite(kpi?.daysOfCover) ? kpi.daysOfCover : null;
    const hasDemand = sales >= DEMAND_THRESHOLD;
    const statusKey = kpi?.statusKey || null;
    const status = statusKey || deriveStatus({ stock, doc, hasDemand });

    if (!grouped[artikel]) {
      grouped[artikel] = {
        modelName: artikel,
        totalSales: 0,
        totalStock: 0,
        totalSkus: 0,
        variants: {},
        salesBySize: new Map(),
        salesByVariant: new Map(),
      };
    }

    const model = grouped[artikel];
    model.totalSales += sales;
    model.totalStock += stock;
    model.totalSkus += 1;
    model.salesBySize.set(groesse, (model.salesBySize.get(groesse) || 0) + sales);
    model.salesByVariant.set(variante, (model.salesByVariant.get(variante) || 0) + sales);

    if (!model.variants[variante]) {
      model.variants[variante] = {
        variantName: variante,
        leiste: {},
        summary: { totalSales: 0, totalStock: 0, skus: 0 },
      };
    }

    const variantEntry = model.variants[variante];
    variantEntry.summary.totalSales += sales;
    variantEntry.summary.totalStock += stock;
    variantEntry.summary.skus += 1;

    if (!variantEntry.leiste[leiste]) {
      variantEntry.leiste[leiste] = {
        sizes: {},
        summary: { totalSales: 0, totalStock: 0, skus: 0 },
      };
    }

    const last = variantEntry.leiste[leiste];
    last.sizes[groesse] = {
      ...kpi,
      salesQty: sales,
      stockQty: stock,
      salesQtyPeriod: sales,
      statusKey,
      status,
    };
    last.summary.totalSales += sales;
    last.summary.totalStock += stock;
    last.summary.skus += 1;
  }

  return grouped;
}

export function getTopSellersByModel(grouped) {
  const result = {};
  const entries = grouped ? Object.entries(grouped) : [];

  for (const [artikel, model] of entries) {
    const collected = [];

    for (const variant of Object.values(model.variants || {})) {
      for (const leisteEntry of Object.values(variant.leiste || {})) {
        for (const cell of Object.values(leisteEntry.sizes || {})) {
          collected.push(cell);
        }
      }
    }

    const sorted = collected
      .slice()
      .sort((a, b) => {
        const salesA = a?.verkaufteMengeTotal ?? 0;
        const salesB = b?.verkaufteMengeTotal ?? 0;
        if (salesA !== salesB) return salesB - salesA;

        const stA = a?.sellThrough ?? 0;
        const stB = b?.sellThrough ?? 0;
        if (stA !== stB) return stB - stA;

        const docA = a?.daysOfCover ?? Number.POSITIVE_INFINITY;
        const docB = b?.daysOfCover ?? Number.POSITIVE_INFINITY;
        return docA - docB;
      })
      .slice(0, 10)
      .map((kpi, index) => ({ ...kpi, rank: index + 1 }));

    result[artikel] = sorted;
  }

  return result;
}

export function getMissingSizesByModel(grouped) {
  const result = {};
  const entries = grouped ? Object.entries(grouped) : [];

  for (const [artikel, model] of entries) {
    const missing = [];

    for (const variantName of Object.keys(model.variants || {})) {
      const variant = model.variants[variantName];

      for (const leisteName of Object.keys(variant.leiste || {})) {
        const leiste = variant.leiste[leisteName];

        for (const kpi of Object.values(leiste.sizes || {})) {
          if (kpi.status !== "MISSING_WITH_DEMAND") continue;

          missing.push({
            artikel,
            variante: kpi.variante,
            leiste: kpi.leiste,
            groesse: kpi.groesse,
            bestand: kpi.bestand,
            verkaufteMengeTotal: kpi.verkaufteMengeTotal,
            daysOfCover: kpi.daysOfCover,
            status: kpi.status,
            reason: "Groesse fehlt bei Nachfrage",
          });
        }
      }
    }

    if (missing.length) {
      result[artikel] = missing;
    }
  }

  return result;
}

function deriveStatus({ stock, doc, hasDemand }) {
  if (stock === 0 && hasDemand) return "MISSING_WITH_DEMAND";
  if (stock === 0) return "MISSING_NO_DEMAND";
  if (doc != null && doc < 5) return "URGENT_LOW_STOCK";
  if (doc != null && doc < 7) return "LOW_STOCK";
  return "OK";
}

function buildTopModels(grouped) {
  return Object.values(grouped || {})
    .map((model) => ({
      modelName: model.modelName,
      totalSales: model.totalSales,
      totalStock: model.totalStock,
      totalSkus: model.totalSkus,
    }))
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 10);
}

export function buildModelInsights(kpis) {
  const grouped = groupByModel(kpis);
  const topSellers = getTopSellersByModel(grouped);
  const missingSizesHighDemand = getMissingSizesByModel(grouped);
  const topModels = buildTopModels(grouped);
  const topSellerModels = buildTopSellerModels(kpis, missingSizesHighDemand);
  const withTopSizeVariant = attachTopSizesAndVariants(grouped);

  return {
    grouped: withTopSizeVariant,
    topSellers,
    missingSizes: missingSizesHighDemand,
    missingSizesHighDemand,
    topModels,
    topSellerModels,
  };
}

function attachTopSizesAndVariants(grouped) {
  const result = { ...grouped };
  for (const [modelName, model] of Object.entries(grouped)) {
    const modelTopSizes = toSortedArray(model.salesBySize || new Map()).slice(0, 5);
    const modelTopVariants = toSortedArray(model.salesByVariant || new Map()).slice(0, 5);
    result[modelName] = {
      ...model,
      modelTopSizes,
      modelTopVariants,
    };
  }
  return result;
}

function toSortedArray(map) {
  const entries = map instanceof Map ? Array.from(map.entries()) : [];
  return entries
    .sort((a, b) => (b?.[1] ?? 0) - (a?.[1] ?? 0))
    .map(([key, value]) => ({ key, sales: value }));
}

export function buildTopSellerModels(kpis, missingSizesByModel) {
  const map = new Map();
  const missingMap = missingSizesByModel || {};
  const list = ensureArray(kpis);

  for (const kpi of list) {
    if (!kpi?.isTopSeller) continue;
    const artikel = kpi.artikel || "Unbekannt";
    const model = map.get(artikel) || {
      model: artikel,
      totalSalesModel: 0,
      totalStockModel: 0,
      oosCount: 0,
      missingHighDemand: 0,
      topRank: Number.POSITIVE_INFINITY,
    };

    model.totalSalesModel += Number(kpi.verkaufteMengeTotal) || 0;
    model.totalStockModel += Number(kpi.bestand) || 0;
    if (kpi.isOOS) model.oosCount += 1;
    model.topRank = Math.min(model.topRank, kpi.rankOverall ?? Number.POSITIVE_INFINITY);

    map.set(artikel, model);
  }

  for (const [artikel, listMissing] of Object.entries(missingMap)) {
    const entry = map.get(artikel);
    if (!entry) continue;
    entry.missingHighDemand = Array.isArray(listMissing) ? listMissing.length : 0;
  }

  return Array.from(map.values())
    .filter((m) => Number.isFinite(m.topRank))
    .sort((a, b) => (a.topRank ?? Number.POSITIVE_INFINITY) - (b.topRank ?? Number.POSITIVE_INFINITY));
}
