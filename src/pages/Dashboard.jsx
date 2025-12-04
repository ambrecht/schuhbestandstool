import React, { useEffect, useMemo, useState } from "react";
import CSVUpload from "../components/CSVUpload";
import AppLayout from "../components/AppLayout";
import DevPanel from "../components/DevPanel";
import TopSellerView from "../components/views/TopSellerView";
import ModelMatrixView from "../components/views/ModelMatrixView";
import SizeLastView from "../components/views/SizeLastView";
import ColorView from "../components/views/ColorView";
import OrderListView from "../components/views/OrderListView";
import LifecycleView from "../components/views/LifecycleView";
import { useFileUploads } from "../hooks/useFileUploads";
import { useInventory } from "../hooks/useInventory";
import { useSales } from "../hooks/useSales";
import { calculateKpis } from "../utils/kpiEngine";
import { buildModelInsights } from "../utils/modelInsightsEngine";
import { filterNonAccessories } from "../utils/selectors";
import { computeLifecycleData } from "../utils/lifecycle";
import {
  buildTopSellerRows,
  collectTopSellerSkuSet,
  buildSizeAndLastAggregations,
  buildColorAggregations,
} from "../utils/viewSelectors";
import {
  buildDefaultPeriod,
  buildRelativePeriod,
  ensurePeriod,
  filterSalesByPeriod,
  getSalesDateRange,
} from "../utils/periods";
import { buildOrderSuggestions } from "../utils/orderSuggestions";
import { logDebug } from "../utils/debug";

function Dashboard() {
  const {
    inventoryData: inventoryRawData,
    salesData: salesRawData,
    loadingInventory,
    loadingSales,
    errorInventory,
    errorSales,
    loadInventoryFile,
    loadSalesFile,
  } = useFileUploads();

  const { inventory } = useInventory(inventoryRawData);
  const { sales: parsedSales } = useSales(salesRawData);

  const salesRange = useMemo(() => getSalesDateRange(parsedSales), [parsedSales]);
  const [periodSelection, setPeriodSelection] = useState(() => buildDefaultPeriod(salesRange));

  useEffect(() => {
    setPeriodSelection(buildDefaultPeriod(salesRange));
  }, [salesRange?.min?.getTime(), salesRange?.max?.getTime()]);

  const effectivePeriod = useMemo(() => ensurePeriod(periodSelection, salesRange), [periodSelection, salesRange]);
  const filteredSales = useMemo(
    () => filterSalesByPeriod(parsedSales, effectivePeriod),
    [parsedSales, effectivePeriod],
  );

  useEffect(() => {
    logDebug("[DEBUG][Dashboard]", {
      inventoryRows: inventory.length,
      salesRows: parsedSales.length,
      filteredSales: filteredSales.length,
      salesRange,
      period: {
        label: formatPeriodLabel(effectivePeriod),
        start: effectivePeriod?.start,
        end: effectivePeriod?.end,
        days: effectivePeriod?.daysInPeriod,
      },
    });
  }, [inventory.length, parsedSales.length, filteredSales.length, salesRange, effectivePeriod]);

  useEffect(() => {
    // Debug helper for a specific SKU across presets
    const TARGET = {
      artikel: "herr neuner",
      variante: "flachs neu",
      leiste: "g",
      groesse: "44",
    };
    const presets = ["dataset", "summer", "winter"];
    presets.forEach((presetKey) => {
      const period =
        presetKey === "dataset"
          ? ensurePeriod({ key: "dataset" }, salesRange)
          : ensurePeriod(buildRelativePeriod(presetKey, salesRange?.max || new Date()), salesRange);
      const scopedSales = filterSalesByPeriod(parsedSales, period);
      const matches = scopedSales.filter(
        (s) =>
          String(s?.artikel || "").toLowerCase() === TARGET.artikel &&
          String(s?.variante || "").toLowerCase() === TARGET.variante &&
          String(s?.leiste || "").toLowerCase() === TARGET.leiste &&
          String(s?.groesse || "").toLowerCase() === TARGET.groesse,
      );
      const count = matches.length;
      const qtySum = matches.reduce((sum, s) => sum + (Number(s?.menge) || 0), 0);
      logDebug("[DEBUG][SKU Herr Neuner]", {
        preset: presetKey,
        period: { start: period.start, end: period.end },
        salesCount: count,
        sumMenge: qtySum,
      });
    });
  }, [parsedSales, salesRange]);

  const kpisRaw = useMemo(
    () =>
      calculateKpis({
        inventory,
        sales: filteredSales,
        allSales: parsedSales,
        daysInPeriodOverride: effectivePeriod.daysInPeriod,
        periodEnd: effectivePeriod.end,
      }),
    [inventory, parsedSales, filteredSales, effectivePeriod],
  );
  const kpis = useMemo(() => filterNonAccessories(kpisRaw), [kpisRaw]);
  const modelInsights = useMemo(() => buildModelInsights(kpis), [kpis]);

  const topSellerRows = useMemo(() => buildTopSellerRows(kpis), [kpis]);
  const topSellerSkuSet = useMemo(() => collectTopSellerSkuSet(kpis), [kpis]);
  const sizeLastAggregates = useMemo(() => buildSizeAndLastAggregations(kpis), [kpis]);
  const colorAggregates = useMemo(() => buildColorAggregations(kpis, modelInsights), [kpis, modelInsights]);
  const orderSuggestions = useMemo(
    () =>
      buildOrderSuggestions(kpis, {
        periodEnd: effectivePeriod.end,
      }),
    [kpis, effectivePeriod],
  );
  const lifecycleData = useMemo(() => computeLifecycleData(kpis, orderSuggestions), [kpis, orderSuggestions]);

  const [activeSection, setActiveSection] = useState("topSeller");
  const [focusFilters, setFocusFilters] = useState({});

  const clearFocus = () => setFocusFilters({});
  const handleSelectSize = (size) => {
    setFocusFilters({ size });
    setActiveSection("topSeller");
  };
  const handleSelectLast = (last) => {
    setFocusFilters({ last });
    setActiveSection("topSeller");
  };
  const handleSelectColor = (variant) => {
    setFocusFilters({ variant });
    setActiveSection("models");
  };

  const periodLabel = formatPeriodLabel(effectivePeriod);

  return (
    <AppLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      period={effectivePeriod}
      onPeriodChange={setPeriodSelection}
      salesRange={salesRange}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {activeSection === "topSeller" && (
          <TopSellerView
            rows={topSellerRows}
            modelInsights={modelInsights}
            focusFilters={focusFilters}
            onClearFocus={clearFocus}
            periodLabel={periodLabel}
          />
        )}

        {activeSection === "models" && (
          <ModelMatrixView
            insights={modelInsights}
            topSellerSkuSet={topSellerSkuSet}
            focusFilters={focusFilters}
            onClearFocus={clearFocus}
            periodLabel={periodLabel}
          />
        )}

        {activeSection === "sizes" && (
          <SizeLastView
            aggregates={sizeLastAggregates}
            onSelectSize={handleSelectSize}
            onSelectLast={handleSelectLast}
            periodLabel={periodLabel}
          />
        )}

        {activeSection === "colors" && (
          <ColorView colors={colorAggregates} onSelectColor={handleSelectColor} periodLabel={periodLabel} />
        )}

        {activeSection === "orders" && (
          <OrderListView suggestions={orderSuggestions} periodLabel={periodLabel} />
        )}

        {activeSection === "steering" && <LifecycleView data={lifecycleData} />}

        <DevPanel title="CSV Upload">
          <CSVUpload
            onInventoryLoad={loadInventoryFile}
            onSalesLoad={loadSalesFile}
            inventoryData={inventoryRawData}
            salesData={salesRawData}
            loadingInventory={loadingInventory}
            loadingSales={loadingSales}
            errorInventory={errorInventory}
            errorSales={errorSales}
          />
          <pre style={{ marginTop: "8px", fontSize: "12px", backgroundColor: "#f9fafb", padding: "8px" }}>
{`Debug:
Inventory: ${inventory.length}
Sales (gefiltert): ${filteredSales.length}
Zeitraum: ${periodLabel}
KPI sample: ${JSON.stringify(kpis.slice(0, 2), null, 2)}`}
          </pre>
        </DevPanel>
      </div>
    </AppLayout>
  );
}

function formatPeriodLabel(period) {
  if (!period?.start || !period?.end) return period?.label || "Zeitraum";
  return `${period.label || "Zeitraum"} (${formatDate(period.start)} – ${formatDate(period.end)})`;
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

export default Dashboard;
