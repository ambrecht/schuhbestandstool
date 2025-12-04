LLM CONTEXT DOCUMENTATION
-------------------------

Purpose: condensed, model-friendly map of the codebase so an LLM can navigate, modify, and extend without human guidance. Keep this as the primary source for other LLMs.

Stack
- React 19 + Vite; TS typechecking, but many files are JS/JSX.
- Inline styles; no external UI kit.
- Dev data auto-loaded from CSVs: data/lagerbestand.csv (inventory), data/verkaufe1825.csv (sales, Latin-1); prod expects uploads.

File tree (selected)
- src/App.jsx: renders Dashboard.
- src/main.tsx: Vite entry.
- src/pages/Dashboard.jsx: orchestrates data/load/period/filter + renders 4 main views.
- src/components/AppLayout.jsx, SectionNav.jsx, PeriodSelector.jsx: layout + global period selector + nav.
- src/components/CSVUpload.jsx, DevPanel.jsx: utility panels.
- src/components/views/TopSellerView.jsx; ModelMatrixView.jsx; SizeLastView.jsx; ColorView.jsx.
- src/hooks/useFileUploads.js; useInventory.js; useSales.js.
- src/utils/csvParser.js; normalization.js; kpiEngine.js; modelInsightsEngine.js; viewSelectors.js; periods.js; recommendationEngine.js; selectors.js (legacy helpers); debug.js (DEBUG flag + logDebug).
- Legacy UI components: KpiFilters.jsx, KpiSummaryCards.jsx, KpiTable.jsx, ReorderRecommendations.jsx, ModelInsights.jsx (old matrix).

Runtime data flow (dev mode)
1) Auto-load CSVs in useFileUploads (DEV only) via parseCSVText; manual uploads override when used.
2) Normalization: useInventory/useSales map raw rows to internal SKUs (artikel/variante/leiste/groesse); sales date parsing handles DD.MM.YYYY + time.
3) Period: getSalesDateRange -> buildDefaultPeriod (CSV min/max) -> ensurePeriod (clamp, daysInPeriod) -> filterSalesByPeriod. Period state lives in Dashboard and is passed to AppLayout/PeriodSelector.
4) KPI calc: calculateKpis merges inventory+filtered sales; derives avgDaily/avgMonthly, ROP, DoC, flags (OOS/low/critical/top-seller rank<=100).
5) Insights/Aggregations: viewSelectors builds top-seller rows, grouped models, top sizes/lasts/colors; collectTopSellerSkuSet; buildModelInsights groups per model.
6) Rendering: Dashboard selects activeSection; four view components render tables/matrices; focusFilters allow cross-view drilldown.

View mapping (4 main views)
- TopSeller (TopSellerView.jsx): Props rows (from buildTopSellerRows), modelInsights, focusFilters, periodLabel. State: onlyOos, grouped, search. Data: Dashboard (kpis -> viewSelectors). Columns: rank, model, variant, last, size, sales, Ø/Monat, stock, reorderPoint, status; sales bar; OOS filter; grouping via groupTopSellersByModel with gap text.
- Modelle (ModelMatrixView.jsx): Props insights (buildModelInsights), topSellerSkuSet, focusFilters, periodLabel. State: query, onlyIssues, selectedModel, activeCell. Filters: search, “Nur Modelle mit Problemen,” reset button; model cards show total sales + gap summary. Matrix per leiste (rows sizes, cols variants); status colors; detail panel: sales/ØMonat/stock/ROP/status text. Empty states for no model/matrix.
- Groessen & Leisten (SizeLastView.jsx): Props aggregates (buildSizeAndLastAggregations), periodLabel; callbacks onSelectSize/onSelectLast to set focus filters (drills into TopSellerView). State: tab (sizes/lasts). Shows top 20 by sales with sales, Ø/Monat, stock, ROP, status (stock vs ROP).
- Farben (ColorView.jsx): Props colors (buildColorAggregations), periodLabel; callback onSelectColor -> focusFilters in Dashboard (opens ModelMatrixView with variant filter). Shows top 20 by sales with sales, Ø/Monat, stock, ROP, modelsWithMissing, status.

Business-logic modules
- utils/kpiEngine.js: core KPI calc; ROP = (avgDailySales*14) + 0.5*workingReserve; avgMonthlySales; DoC; flags isOOS/isLowStock/isUrgent/isTopSeller; daysInPeriodOverride input. Central logic.
- utils/viewSelectors.js: aggregates for views (top sellers, grouped models, sizes/lasts, colors), gap summaries, top-seller SKU set, model list. Single source for view-level data.
- utils/modelInsightsEngine.js: groups KPIs into nested model->variant->leiste->size; derives missing sizes with demand; top sellers per model; top sizes/variants per model. Used by Dashboard + ModelMatrixView.
- utils/periods.js: min/max sales range, default period = CSV range, presets (last30/90/summer/winter), clamp to data, daysInPeriod, filterSalesByPeriod.
- utils/csvParser.js: parseCSVFile/parseCSVText, delimiter detection, header normalization (umlauts, aenderungsdatum alias), value cleaning.
- utils/recommendationEngine.js + utils/selectors.js: legacy reorder/top-seller monitor helpers (not used by new IA).
- utils/normalization.js: normalize text/number/size, buildSku; used in hooks.
- utils/debug.js: DEBUG flag + logDebug helper to gate console output.

Legacy/Alt UI (likely removable/migrate)
- components/KpiFilters.jsx, KpiSummaryCards.jsx, KpiTable.jsx, ReorderRecommendations.jsx.
- components/ModelInsights.jsx (old matrix view).
- utils/selectors.js (top seller monitor, models with gaps) + recommendationEngine.js (legacy reorder scoring).
- Old page variants are gone; Dashboard is the only page.

Complexity hotspots (largest files by size)
- components/views/ModelMatrixView.jsx (~16 KB): matrix building, filters, detail panel; medium complexity, multiple nested loops.
- components/views/TopSellerView.jsx (~12 KB): table, grouping, filters; moderate complexity.
- components/ModelInsights.jsx (~11 KB): legacy; dense table/matrix logic.
- utils/viewSelectors.js (~7 KB) and modelInsightsEngine.js (~7 KB): aggregation logic; careful when changing grouping.
- utils/kpiEngine.js (~6.6 KB): core KPI calculations; keep consistent.
- Dashboard.jsx (~6 KB): orchestrates state/data; single entry point for period + focus filters.

Tests & guardrails
- No automated tests present (no __tests__, no vitest/jest files). Only build step via npm run build and screenshot script (scripts/capture-screenshots.js) using Playwright.

Navigation/state
- SectionNav keys: topSeller, models, sizes, colors.
- Dashboard holds activeSection + focusFilters; focus filters propagate across views (size/last/variant/model). onSelectSize/onSelectLast → TopSeller filter; onSelectColor → ModelMatrix variant filter.

Data assumptions
- Inventory fields normalized: artikel/variante/leiste/groesse/bestand/bestandseinheit.
- Sales date header may be aenderungsdatum (with umlaut variants); parser normalizes; date parsing supports German formats.

How to extend (hints)
- New metrics: add to kpiEngine, surface via viewSelectors.
- Period presets/clamping: adjust utils/periods + PeriodSelector.
- Add filters/drilldowns: extend Dashboard focusFilters and pass props into views; keep useMemo for sort/filter.
