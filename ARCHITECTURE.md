# Bestandstool – Architektur & aktueller Stand (nach UX/KPI/Parser/Engine-Refactor)

Rein clientseitige React/Vite-App. CSV-Uploads für Inventar/Verkäufe; in DEV auto-load aus `data/`. Keine Backend-Abhängigkeiten.

## Laufzeit-Flow (Pipeline)
1) `src/main.tsx` → mountet `App`.
2) `src/App.jsx` → rendert `Dashboard`.
3) `src/pages/Dashboard.jsx` orchestriert:
   - (DEV) CSV-Autoload per Raw-Import → `useFileUploads` oder manuelles Upload via DevPanel.
   - Parsing: `parseCSVFile` (normalisiert Header/Values).
   - Transformation: `useInventory` / `useSales` (Normalisierung, SKU-Bildung).
   - KPIs: `calculateKpis` (robustere Formeln/Flags).
   - Filterung: `KpiFilters` → `filteredKpis`.
   - Ableitungen: `getReorderRecommendations`, `buildModelInsights`.
   - Darstellung: KPI-Cards, Tabellen, Reorder, Model-Insights, Sidepanels.

## Kern-Module
- Parsing & Normalisierung
  - `src/utils/csvParser.js`: Lightweight CSV-Parser (Delimiter ,/;), Header-/Value-Normalisierung (BOM/Zero-Width/NBSP, Umlaut-Translit), Zahlenerkennung.
  - `src/utils/normalization.js`: `normalizeText`, `normalizeNumber`, `normalizeSize` (Groesse-Mapping), `buildSku`.
- Upload & Data Input
  - `src/components/CSVUpload.jsx`: UI für Inventar/Sales File-Inputs, Status/Reset; ruft nur Loader-Props.
  - `src/hooks/useFileUploads.js`: liest CSVs mit `parseCSVFile`, hält Rohdaten + Loading/Error, akzeptiert `null` zum Reset; DEV lädt Beispiel-CSVs auto.
- Transformation Hooks
  - `useInventory.js`: nutzt Normalizer, robustes Größenmapping, SKU `${artikel}-${variante}-${leiste}-${groesse}`, Zahlkonvertierung.
  - `useSales.js`: gleiches Mapping, SKU-Bau, Zahl/Datum robust.
- KPI & Engines
  - `kpiEngine.js`: Sell-Through/DoC härten (NaN/0-Checks), Flags: `isOOS`, `isLowStock`, `isUrgent` (DoC<5), `isSlowMover`. Sales-Summen per SKU, Normalisierung durchgängig.
  - `recommendationEngine.js`: Reorder mit strukturierter Reason `{type: urgent|priority|monitor, details}`, Priorisierung (DoC, Sales-Intensität, Sell-Through), dedupe pro Modell, konfigurierbare Thresholds.
  - `modelInsightsEngine.js`: Gruppierung artikel → variante → leiste → groesse; Top-Seller (Top 10), fehlende/kritische Größen je Modell.
- UI-Komponenten (Auswahl)
  - `AppLayout`, `SectionNav`: Rahmen, Navigation, Branding, zentrierter Container.
  - `DevPanel`: collapsible, nur DEV, enthält Upload + Debug.
  - `KpiSummaryCards`: 3×2 Grid, priorisierte KPIs (Low Stock, Slow Movers, Urgent, OOS, Total, Avg ST) mit Badges.
  - `KpiFilters`: kompakte sticky Filterleiste, Aktiv-Badge, Filterchips + Reset.
  - `KpiTable`: konfigurierbare Spalten, sticky erste Spalte, Zebra/Hover, optional expandable Rows mit Detail-Panel.
  - `ReorderRecommendations`: Tabelle, Reasons als farbige Badges.
  - `ModelInsights`: Header + Dropdown vereint; Kennzahlen-Cards; Matrix Variante×Leiste×Größe; Top Seller; Missing Sizes.

## Seiten / IA
- Dashboard (Decision Hub)
  - 2-Spalten-Layout: links KPI-Cards, Quick-Hinweise, To-Do; rechts Action Panel (Top Low-Stock/OOS, Links).
  - To-Dos: Low-Stock <5 DoC, fehlende Größen, Reorder-Anzahl.
- Bestandsanalyse
  - Filterleiste (sticky) + Chips/Reset.
  - Kernspalten-Tabelle (SKU, Artikel, Variante, Leiste, Größe, Bestand, Verkäufe, ST, DoC, Flags) mit expandierbaren Detail-Panels.
  - Sidepanel: gefilterte Summaries (Low-Stock/Urgent/OOS), Top Sales, Top Low-Stock, OOS-Top5, Hinweise.
- Reorder
  - Header-Kacheln (Total, Urgent, Priority, Monitor), Reorder-Tabelle mit strukturierter Reason, Sidepanel für dringende Modelle.
- Modelle
  - Header + Dropdown kombiniert, Kennzahlen-Cards, Matrix, Top Seller, fehlende Größen.

## Datenmodelle
- Inventory: `{ sku, artikel, variante, leiste, groesse, bestand, bestandseinheit }`
- Sales: `{ sku, artikel, variante, leiste, groesse, menge, datum }`
- KPI: `{ sku, artikel, variante, leiste, groesse, kategorie, bestand, verkaufteMengeTotal, sellThrough, daysOfCover, isOOS, isLowStock, isUrgent, isSlowMover }`
- Model-Insights: `{ grouped, topSellers, missingSizes }` (siehe Engines).
- Reorder-Reason: `{ type: 'urgent'|'priority'|'monitor', details: { doc, sales, sellThrough, lowStock, urgent } }`

## KPI-Definitionen
- Sell-Through = sales / (sales + stock); 0 → null
- avgDailySales = sales / 30
- Days of Cover = stock / avgDailySales; wenn avgDailySales ≤0 → null
- Flags: `isOOS = stock === 0`; `isLowStock = DoC < 7`; `isUrgent = DoC < 5`; `isSlowMover = avgDailySales < 0.1 && stock > 0`

## Dev/Prod
- DEV: Autoload Beispiel-CSVs; DevPanel sichtbar. PROD: Autoload/DevPanel entfernen falls nötig. Keine externen UI-Libraries; reines React + Inline-Styles.

## Letzte wesentliche Änderungen (Why/How/Impact)
- Normalisierung: Einführung `normalization.js` + Hook-Refactor für saubere Größen/SKU/Numbers → robustere Datenbasis.
- KPI-Engine: Edge-Case-Schutz, neue Flag `isUrgent`, konsistente Normalisierung → stabilere KPIs.
- Reorder-Engine: strukturierte Reason, Priorisierung mit Score (DoC, Sales-Intensität, ST), dedupe je Modell → professionellere Empfehlungen.
- Bestandsanalyse-UX: Filterchips + Reset, expandable Rows, dynamische Sidepanels → schnellere Diagnose, weniger Canvas-Waste.
- Dashboard/IA: Decision-Hub-Layout mit To-Do/Action Panels → klarere Next Actions.
- Tables/UI: konfigurierbare Spalten, sticky first col, Badges/Karten vereinheitlicht → bessere Lesbarkeit/Struktur.
