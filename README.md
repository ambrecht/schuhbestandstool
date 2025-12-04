# Bestandstool – Entwickler-Doku (Kurz & Klar)

Diese App ist ein clientseitiges React/Vite-Cockpit für einen stationären Schuhladen. Sie nutzt zwei CSVs (Bestand + Verkäufe), normalisiert die Daten, berechnet KPIs und zeigt priorisierte Reorder-Listen, Top-Seller-Alarme und Modell-Lücken.

## Ziel des Tools
- Schnell sehen, was **heute** nachbestellt werden muss (Reorder, nach Dringlichkeit).
- Top-Seller ohne/mit kritischem Bestand identifizieren.
- Fehlende Größen/Farben mit Nachfrage je Modell erkennen.

## Datenfluss
1) Upload über UI (`CSVUpload`) → `useFileUploads` → `parseCSVFile`.
2) Normalisierung: `useInventory`, `useSales` nutzen `normalization.js` (BOM/Zero-Width-Strip, Zahl/Datum, Größenmapping).
3) SKU-Bau: `artikel|variante|leiste|groesse` via `buildSku`.
4) Union-Set: KPIs für alle SKUs aus Inventory **und** Sales (Sales-only SKUs bekommen stock=0).
5) Zubehör-Filter: `filterNonAccessories` entfernt Schuhlöffel/Schuhbänder etc.

## KPI-Engine (`src/utils/kpiEngine.js`)
- Konstanten: `LEAD_TIME_DAYS=14`, `SAFETY_FACTOR=0.5`, `REVIEW_CYCLE_DAYS=7`, `CRITICAL_QTY_PER_SIZE=2`, `URGENT_DOC_THRESHOLD=5`.
- Zeitraum: `daysInPeriod = max(30, diff der Verkäufe)`, `avgDailySales = salesQty / daysInPeriod`.
- KPIs je SKU:
  - Mengen: `bestand`, `verkaufteMengeTotal`.
  - Basis: `sellThrough`, `daysOfCover`, `turns`.
  - ROP/Min-Max: `workingReserve`, `safetyStock`, `reorderPoint`, `maxStock`; `needsReorder = stock <= reorderPoint`.
  - Flags: `isOOS`, `isCriticalQty (<=2)`, `isLowStock (DoC<7)`, `isUrgent (DoC<5 || critical)`, `isSlowMover (avgDailySales<0.1)`.
  - Policy (optional, default `normal`).
  - Top-Seller: `rankOverall`, `isTopSeller (Top100)`, `isTopSellerOOS/LowStock/Urgent`.

## Model Insights (`src/utils/modelInsightsEngine.js`)
- Arbeitet auf KPIs, nicht Rohdaten.
- Struktur: `grouped[artikel][variante][leiste][groesse] = { ...kpi, status }`.
- Demand-Threshold: 3 Verkäufe.
- Status je Zelle: `MISSING_WITH_DEMAND`, `MISSING_NO_DEMAND`, `URGENT_LOW_STOCK`, `LOW_STOCK`, `OK`.
- Pro Modell:
  - `totalSales`, `totalStock`, `missingSizesHighDemand` (alle `MISSING_WITH_DEMAND`),
  - `modelTopSizes`, `modelTopVariants` (Top 5 nach Sales).

## Reorder-Engine (`src/utils/recommendationEngine.js`)
- Kandidaten: `needsReorder` && `policy==='normal'` && (sales>0 oder avgDailySales>0).
- `priorityScore = 3*Top + 4*OOS + 2*DoC + 1*ST`.
- Typ: TopSeller+OOS → `urgent`; TopSeller+Urgent → `urgent`; OOS/Low/Urgent → `priority`; sonst `monitor`.
- `reason.details`: doc, sales, sellThrough, lowStock, urgent, topSeller, topSellerOOS, criticalQty, priorityScore.

## Selector-Utilities (`src/utils/selectors.js`)
- `getTodayReorders`, `getTopSellerMonitor`, `getCriticalSizes` (isUrgent || isCriticalQty, optional nur Top-Seller), `getModelsWithGaps`, `getTopSellerOos*`, `filterNonAccessories`.

## UI-Struktur (`src/pages/Dashboard.jsx` und Komponenten)
- Blöcke:
  - **Heute bestellen**: Cards (urgent/priority, Top-Seller OOS, kritische Größen, fehlende Größen) + schlanke Reorder-Tabelle (expandierbare Details).
  - **Top-Seller Monitor**: Tabs OOS/Low-Stock + Liste „Kritische Größen“ (Top 5, Toggle nur Top-Seller).
  - **Modelle mit fehlenden Größen**: modellbasierte Liste (missingSizesHighDemand).
  - **Detailanalyse**: ModelInsights (Matrix/Heatmap).
  - **Reorder-Seite**: ReorderRecommendations-Tabelle + Block „Top-Seller ohne Bestand“.
- Komponenten:
  - `ReorderRecommendations.jsx`: Tabelle mit Bestand, Dringlichkeit, DoC, Verkäufe (30T), Begründung, Checkbox.
  - `ModelInsights.jsx`: Matrix Größe × Variante/Leiste; Rot=ausverkauft, Orange=kritischer Restbestand (⚠); Legende.

## Build & Inline
- Dev: `npm run dev`
- Prod: `npm run build` → `dist/`
- Optional ein-Datei-Bundle: `node inline-bundle.js` (generiert `dist/inline.html` mit inline JS/CSS).

## Wichtig für neue Features
- Immer auf KPIs arbeiten, nicht auf Rohdaten.
- SKU-Format und Union-Set respektieren (Sales-only SKUs behalten).
- Reorder/Monitor-Logik nicht unterlaufen: nur `needsReorder` + Nachfrage berücksichtigen.
- Top-Seller/OOS/kritische Größen klar hervorheben; Details in Tooltips/Expandern statt Spaltenflut.
