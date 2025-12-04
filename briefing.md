# Briefing für Webdesigner – Bestandstool (Status & Ziele)

## Ziele (Business & UX)
1) Sofort sehen: Top-Seller (z. B. Top 100) und deren Performance.
2) Besonders wichtig: Welche Top-Seller sind aktuell OOS (Bestand = 0).
3) Tiefendimension: Welche Farben/Varianten/Leisten/Größen verkaufen sich am besten, was ist auf Lager, was ist OOS.

## Views & aktuelle Umsetzung

### Dashboard (Decision Hub)
- **Zweck**: Schneller Überblick, To-Dos, Sprungpunkte in Detail-Ansichten.
- **Inhalt**:
  - KPI-Cards (Low Stock, Slow Movers, Urgent, OOS, Total, Avg ST).
  - To-Do-Karte (Low-Stock <5 DoC, fehlende Größen, Reorder-Anzahl).
  - Action Panel: Top Low-Stock/OOS (inkl. Top OOS-Seller), Quick Links.
- **Design**: 2-Spalten-Layout, Cards mit Badges, ruhige Farbgebung.
- **Gap**: Visualisierung für „Top 100 Seller“ fehlt; mehr Gewicht auf OOS-Top-Seller denkbar; Clickthrough in Filterzustände ist rudimentär.

### Bestandsanalyse
- **Zweck**: Diagnose pro SKU, schnelles Filtern und Prüfen.
- **Inhalt**:
  - Sticky Filterbar (Artikel/Kategorie/Größe/Leiste + OOS/LowStock/SlowMover), Filterchips + Reset.
  - Kernspalten-Tabelle (SKU, Artikel, Variante, Leiste, Größe, Bestand, Verkäufe, ST, DoC, Flags), expandierbare Rows mit Details.
  - Sidepanel: gefilterte Summaries (Low-Stock/Urgent/OOS), Top Sales, Top Low-Stock, OOS-Top5.
- **Design**: Inline-Styles, klare Tabelle, Zebra/Hover, sticky erste Spalte.
- **Gap**: Keine dedizierte Top-100-Seller-Ansicht; Sidepanel könnte nach Top-Seller/OOS stärker gewichten; Varianten/Farben/Leisten/Größen nicht visuell hervorgehoben.

### Reorder
- **Zweck**: Priorisierte Einkaufsempfehlungen.
- **Inhalt**:
  - Kacheln (Total, Urgent, Priority, Monitor).
  - Tabelle mit Reason-Badges (Low Stock/Urgent etc.), priorisiert nach DoC/Sales-Intensität/STS.
  - Sidepanel „Dringend nach Modell“, Top-Seller ohne Bestand.
- **Design**: Tabellenlastig, klare Badges.
- **Gap**: Keine dedizierte „Top-Seller ohne Bestand (Top 100)“-Liste; Farben/Größen nicht hervorgehoben.

### Modelle (Model Insights)
- **Zweck**: Varianten-/Größensteuerung pro Modell.
- **Inhalt**:
  - Dropdown + Header, Kennzahlen-Cards (Total Sales/Stock/SKUs).
  - Matrix Variante×Leiste×Größe (Bestände), Top Seller, Missing Sizes.
- **Design**: Card-basiert, Tabelle im Matrix-Stil.
- **Gap**: Fehlende Visualisierung nach Farben/Varianten; keine Heatmap für Sizes/OOS; keine dedizierte „Top Seller pro Modell“ OOS-Liste.

## Empfehlungen für Design-Schwerpunkte
- **Top-Seller/OOS-Fokus**: 
  - Eigenen Bereich „Top 100 Seller“ mit Ranking, Filter (Kategorie/Modell), und OOS-Badge + Lagerbestand.
  - Shortcut „Nur OOS-Top-Seller anzeigen“.
  - KPIs pro Item: Sales, ST, DoC, Lagerbestand (rot = 0, amber <7 DoC).
- **Varianten/Größen/Leisten**:
  - Visuelle Matrix/Heatmap (Größe/Leiste/Variante) mit Sales/Stock/OOS-Signalen.
  - Farbcodierung pro Status (grün=OK, amber=Low, rot=OOS).
  - Drilldown von Top-Seller → Varianten/Größen (mit Lager/OOS).
- **Navigation & IA**:
  - Schnelle Clickthroughs von Dashboard-To-Dos in gefilterte Ansichten (Bestandsanalyse/Reorder/Modelle).
  - Konsistente Cards/Table-Styling; Platz für rechte Sidepanels reservieren.
- **Information Density**:
  - Kompakte Tabellen (reduzierte Zeilenhöhe), klarer Header, fixierte erste Spalte.
  - Sidepanel mit OOS-Top-Seller immer präsent.
- **Microcopy**:
  - Klarer Purpose: „Top-Seller mit Bestand 0 zuerst fixen.“
  - Tooltips/Legende für ST/DoC/Flags.

## Datei-Referenzen (für Designer)
- Layout/Navigation: `src/components/AppLayout.jsx`, `SectionNav.jsx`
- Dashboard: `src/pages/Dashboard.jsx` (Struktur, Cards, Panels)
- Filter: `src/components/KpiFilters.jsx`
- Tabellen: `src/components/KpiTable.jsx`, `ReorderRecommendations.jsx`, `ModelInsights.jsx`
- KPI-Logik: `src/utils/kpiEngine.js`
- Reorder-Logik: `src/utils/recommendationEngine.js`
- Model Insights: `src/utils/modelInsightsEngine.js`, `src/components/ModelInsights.jsx`

## Kurz-Ziele für das Redesign
1) Ein dediziertes „Top-Seller & OOS“-Panel (Top 100, sortiert nach Sales/STS) mit klaren OOS-Hinweisen.
2) Varianten-/Größen-Matrix als Heatmap, fehlende Größen hervorheben.
3) Clickthrough-Flows (Dashboard → gefilterte Tabellen) sichtbarer machen.
4) Einheitliche UI-Bausteine (Cards, Badges, Tables) und klare Farb-Legende für Bestandszustände.
