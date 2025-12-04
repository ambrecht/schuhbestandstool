const CORE_SIZES = ["38", "39", "40", "41", "42", "43", "44"];
const OVERSTOCK_RATIO = 5;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function computeLifecycleData(kpis, suggestions = []) {
  const list = Array.isArray(kpis) ? kpis : [];
  const modelMap = new Map();
  const skuRecords = [];

  list.forEach((kpi) => {
    if (!kpi) return;
    const model = kpi.artikel || "Unbekannt";
    const sales12 = toNumber(kpi.salesQtyLast12M);
    const sales24 = toNumber(kpi.salesQtyLast24M || kpi.salesQtyLifetime);
    const stock = toNumber(kpi.bestand ?? kpi.stockQty);
    const hasSales12M = sales12 > 0;
    const hasSales24M = sales24 > 0;
    const hasStockToday = stock > 0;
    const stockToSalesRatio = sales12 > 0 ? stock / sales12 : stock > 0 ? stock : 0;
    const isDead12M = stock > 0 && sales12 === 0;
    const isDead24M = stock > 0 && sales24 === 0;
    const isOverstocked = stockToSalesRatio > OVERSTOCK_RATIO;

    let skuClass = null;
    if (hasSales12M && hasStockToday) skuClass = "A1";
    else if (hasSales12M && !hasStockToday) skuClass = "A2";
    else if (hasSales24M && !hasSales12M && hasStockToday) skuClass = "B";
    else if (!hasSales24M && hasStockToday) skuClass = "C";

    const entry = {
      ...kpi,
      hasSales12M,
      hasSales24M,
      hasStockToday,
      stockToSalesRatio,
      isDead12M,
      isDead24M,
      isOverstocked,
      skuClass,
    };
    skuRecords.push(entry);

    const modelEntry =
      modelMap.get(model) ||
      {
        model,
        totalSales12M: 0,
        totalSales24M: 0,
        totalStock: 0,
        skus: [],
        sizesWithStock: new Set(),
      };
    modelEntry.totalSales12M += sales12;
    modelEntry.totalSales24M += sales24;
    modelEntry.totalStock += stock;
    if (stock > 0 && kpi.groesse) modelEntry.sizesWithStock.add(String(kpi.groesse));
    modelEntry.skus.push(entry);
    modelMap.set(model, modelEntry);
  });

  // Core size coverage + A3 detection
  modelMap.forEach((m) => {
    const covered = CORE_SIZES.filter((s) => m.sizesWithStock.has(s)).length;
    const coverage = CORE_SIZES.length > 0 ? covered / CORE_SIZES.length : 1;
    const hasCoreSizesAvailable = coverage >= 0.8;
    m.coreCoverage = coverage;
    m.hasCoreSizesAvailable = hasCoreSizesAvailable;
    const modelHasSales12 = m.totalSales12M > 0;
    const modelHasStock = m.totalStock > 0;
    m.modelClass = modelHasSales12 && modelHasStock && !hasCoreSizesAvailable ? "A3" : null;
  });

  // ABC by model (using sales12 as proxy for revenue)
  const modelsSorted = Array.from(modelMap.values()).sort((a, b) => b.totalSales12M - a.totalSales12M);
  let cumulative = 0;
  const totalSalesAll = modelsSorted.reduce((sum, m) => sum + m.totalSales12M, 0) || 1;
  modelsSorted.forEach((m) => {
    const share = m.totalSales12M / totalSalesAll;
    cumulative += share;
    if (cumulative <= 0.8) m.abcClass = "A";
    else if (cumulative <= 0.95) m.abcClass = "B";
    else m.abcClass = "C";
  });

  // Powerwall top25
  const powerwall = modelsSorted.slice(0, 25).map((m) => ({
    model: m.model,
    abcClass: m.abcClass,
    coreCoverage: m.coreCoverage,
    hasCoreSizesAvailable: m.hasCoreSizesAvailable,
    totalSales12M: m.totalSales12M,
    totalStock: m.totalStock,
  }));

  // Class counts
  const classCounts = { A1: 0, A2: 0, A3: 0, B: 0, C: 0, salesA1: 0, salesA2: 0, salesA3: 0, salesB: 0, salesC: 0 };
  skuRecords.forEach((s) => {
    if (s.skuClass === "A1") {
      classCounts.A1 += 1;
      classCounts.salesA1 += toNumber(s.salesQtyLast12M);
    } else if (s.skuClass === "A2") {
      classCounts.A2 += 1;
      classCounts.salesA2 += toNumber(s.salesQtyLast12M);
    } else if (s.skuClass === "B") {
      classCounts.B += 1;
      classCounts.salesB += toNumber(s.salesQtyLast12M);
    } else if (s.skuClass === "C") {
      classCounts.C += 1;
      classCounts.salesC += toNumber(s.salesQtyLast12M);
    }
  });
  modelsSorted.forEach((m) => {
    if (m.modelClass === "A3") {
      classCounts.A3 += 1;
      classCounts.salesA3 += m.totalSales12M;
    }
  });

  // Action lists
  const suggestionsList = Array.isArray(suggestions) ? suggestions : [];
  const suggestionsBySku = new Map();
  suggestionsList.forEach((s) => {
    if (s?.sku) suggestionsBySku.set(s.sku, s);
  });

  const nachfuellen = [];
  skuRecords
    .filter((s) => s.skuClass === "A1" && s.needsReorder)
    .forEach((s) => {
      const sug = suggestionsBySku.get(s.sku);
      nachfuellen.push(buildActionRow(s, "A1", sug));
    });

  modelsSorted
    .filter((m) => m.modelClass === "A3")
    .forEach((m) => {
      nachfuellen.push({
        model: m.model,
        sku: null,
        skuClass: "A3",
        abcClass: m.abcClass,
        lager: "-",
        variant: "-",
        size: "Core fehlt",
        stock: m.totalStock,
        reorderPoint: "-",
        orderQty: "-",
        lastSaleDate: "-",
        sales12M: m.totalSales12M,
        note: "Kern-Groessen unvollstaendig",
      });
    });

  modelsSorted
    .filter((m) => m.totalSales12M > 0 && m.totalStock === 0)
    .slice(0, 20)
    .forEach((m) => {
      nachfuellen.push({
        model: m.model,
        sku: null,
        skuClass: "A2",
        abcClass: m.abcClass,
        lager: "-",
        variant: "-",
        size: "-",
        stock: 0,
        reorderPoint: "-",
        orderQty: "-",
        lastSaleDate: "-",
        sales12M: m.totalSales12M,
        note: "Phantom (Umsatz, kein Bestand)",
      });
    });

  const reduzieren = skuRecords
    .filter((s) => (s.skuClass === "C" && s.hasStockToday) || (s.skuClass === "B" && s.isOverstocked))
    .sort((a, b) => toNumber(b.stockToSalesRatio) - toNumber(a.stockToSalesRatio))
    .map((s) => ({
      model: s.artikel,
      variant: s.variante,
      size: s.groesse,
      lager: s.lager,
      sku: s.sku,
      skuClass: s.skuClass,
      abcClass: findModelABC(modelsSorted, s.artikel),
      stock: s.bestand ?? s.stockQty,
      sales12M: s.salesQtyLast12M,
      sales24M: s.salesQtyLast24M,
      stockToSalesRatio: s.stockToSalesRatio,
      note: s.isDead24M ? "24M dead stock" : s.isDead12M ? "12M dead stock" : "Überbestand",
    }));

  return {
    classCounts,
    models: modelsSorted,
    skuRecords,
    powerwall,
    nachfuellen,
    reduzieren,
    abcSummary: buildAbcMatrix(modelsSorted, skuRecords),
  };
}

function buildActionRow(s, skuClass, suggestion) {
  return {
    model: s.artikel,
    variant: s.variante,
    size: s.groesse,
    lager: s.lager,
    sku: s.sku,
    skuClass,
    abcClass: null,
    stock: s.bestand ?? s.stockQty,
    reorderPoint: s.reorderPoint,
    orderQty: suggestion?.orderQty ?? s.orderQty ?? Math.max(0, Math.ceil((s.reorderPoint || 0) - (s.stockQty || 0))),
    lastSaleDate: s.lastSaleDate,
    sales12M: s.salesQtyLast12M,
    note: "Nachfuellen",
  };
}

function buildAbcMatrix(models, skus) {
  const matrix = {
    A: { A1: 0, A2: 0, A3: 0, B: 0, C: 0 },
    B: { A1: 0, A2: 0, A3: 0, B: 0, C: 0 },
    C: { A1: 0, A2: 0, A3: 0, B: 0, C: 0 },
  };
  const modelAbc = new Map(models.map((m) => [m.model, m.abcClass]));
  skus.forEach((s) => {
    const abc = modelAbc.get(s.artikel) || "C";
    const lifecycle = s.skuClass || "C";
    if (!matrix[abc][lifecycle] && matrix[abc][lifecycle] !== 0) return;
    matrix[abc][lifecycle] += 1;
  });
  return matrix;
}

function findModelABC(models, modelName) {
  const entry = models.find((m) => m.model === modelName);
  return entry?.abcClass || null;
}
