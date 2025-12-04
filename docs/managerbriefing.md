# Manager-Briefing: Bestandstool (Bestellungen & KPIs)

## Ziel & Nutzen
- Zweck: Schnelles Erkennen, was heute nachbestellt werden muss, bevor Topseller auslaufen oder Luecken im Sortiment entstehen.
- Nutzer: Filial- und Bestandsmanager ohne Technik-Setup – reine Browser-App, arbeitet auf CSV-Exports (Bestand & Verkaeufe).
- Ergebnis: Klare Bestellliste je Modell/Farbe/Leiste/Groesse, priorisiert nach Dringlichkeit und Nachfrage.

## Datenbasis & Fluss
- Input: Zwei CSVs – Inventar (`lagerbestand`) und Verkaeufe (`verkaeufe`). In DEV sind Beispiel-CSVs vorbefuellt.
- Normalisierung: Bereinigung (BOM/Zero-Width/Leerzeichen), Zahl-/Datums-Parsen (inkl. deutsches Datum), Groessen-Mapping, SKU-Bau `artikel|variante|leiste|groesse`.
- Zeitraum: Standard „Letzte 30 Tage“, wenn der Datensatz lang ist; sonst der CSV-Zeitraum. Saison-Presets (Sommer/Winter) und freie Datumswahl vorhanden.
- Zubehoer-Filter: Zubehoer (z. B. Schuhbaender) wird aus KPI-Ansichten gefiltert, damit die Bestelllogik auf Schuhe fokussiert bleibt.

## Kennzahlen & Schwellen (pro SKU)
- Sales-Fenster: min. 30 Tage oder gewaehlter Zeitraum; `avgDailySales = salesQty / days`.
- Sell-Through: `sales / (sales + stock)`; Days of Cover (DoC) = `stock / avgDailySales` (falls Nachfrage > 0).
- Reorder-Formel:
  - Lead Time: 14 Tage
  - Safety-Faktor: 0.5
  - Working Reserve: `avgDailySales * 14`
  - Safety Stock: `0.5 * Working Reserve`
  - Reorder Point (ROP): `working + safety`, Mindestschwelle 0.5; `needsReorder`, wenn `stock <= ROP`.
- Flags: `isOOS` (0 Bestand), `isLowStock` (DoC < 7), `isUrgent` (DoC < 5 oder kritisch <= 2 Paare), `isTopSeller` (Top 100 nach Verkaeufen).

## Bestell-Logik (welche Schuhe, wie viel)
- Filter: Nur SKUs mit ROP > 0, unter Mindestbestand und Nachfrage (Verkaeufe im Zeitraum oder in den letzten 12 Monaten), keine historischen Karteileichen.
- Bestellmenge: `orderQty = ceil(ROP - stock)` pro SKU.
- Aggregation: Bestellung wird pro Modell -> Variante -> Leiste -> Groesse zusammengefasst, damit eine kompakte Bestellliste entsteht.
- Priorisierung: Dringlichkeitsscore beruecksichtigt Topseller, OOS, DoC und Sell-Through; Anzeige als Typ `urgent | priority | monitor`.

## Oberflaeche & Workflow
- Dashboard-Views: Topseller, Modell-Matrix (fehlende Groessen), Groessen/Leisten-Analyse, Farben, Bestellliste.
- Bestellliste: Download als CSV/Print; Filter auf Topseller-Modelle oder Modelle mit Engpaessen; Matrix pro Modell/Farbe/Leiste mit benoetigten Groessen.
- Periodenwahl: Presets + Custom-Datum; Umschalten aendert sofort KPIs, ROP und Bestellvorschlaege.

## Was wir (noch) nicht tun
- Kein automatischer Abgleich mit Lieferzeiten pro Lieferant; Lead Time ist global (14 Tage).
- Keine Preis-/Marge-Optimierung in der Priorisierung.
- Kein automatischer Ex-/Import ins ERP; Export per CSV/Print fuer den manuellen Prozess.

## Gewuenschtes Feedback (bitte kurz beantworten)
1) Algorithmus: Passt der globale Lead-Time/Safety-Faktor (14 Tage / 0.5)? Sollen wir lieferantenspezifisch unterscheiden?
2) Nachfrage-Filter: Sollen sehr alte, aber wiederkehrende Artikel trotz schwacher letzter 12 Monate vorgeschlagen werden?
3) Priorisierung: Reicht die aktuelle Gewichtung (Topseller/OOS/DoC/Sell-Through), oder sollen Margen/UVP/Preisgruppen einfliessen?
4) Anzeige: Fehlen Kennzahlen in der Bestellliste (z. B. letzter Verkaufstag, Marge, Lieferant)? Werden weitere Sichten gebraucht (z. B. Filial-Split)?
5) Export: Reicht CSV/Print, oder wird ein spezifisches Format fuer das ERP benoetigt?
6) Saisonalitaet: Sollen Sommer/Winter-Presets anders geschnitten werden (aktuell 01.04–30.09 / 01.10–31.03)?

Danke fuer die Rueckmeldung – wir priorisieren die Antworten direkt im naechsten Sprint.

## (Entwurf) Antwort- und Verbesserungs-Vorschlaege
1) Lead Time / Safety-Faktor  
   - 14 Tage / 0.5 bleibt als globaler Default vernuenftig (klassische Min/Max-Logik).  
   - Vorschlag: optionale Overrides je Lieferant/Marke/Warengruppe; spaeter per gemessenem Lieferzeit-Median und 90–95 %-Quantil kalibrieren.
2) Nachfrage-Filter fuer alte, wiederkehrende Artikel  
   - Standard beibehalten (Fokus auf Verkäufe im Zeitraum bzw. letzte 12 Monate).  
   - Zusatz-Flag „Klassiker/Evergreen“: erlaubt kleine Vorschlaege, wenn Artikel in mehreren Saisons verkauft wurde, obwohl letzte 12 Monate schwach.
3) Priorisierung / Score (Risiko vs. Marge)  
   - Aktueller Score bleibt fuer operative Dringlichkeit passend.  
   - Kurzfristig: Marge/UVP/Preisgruppe als optionale Spalte + Filter in der Bestellliste.  
   - Mittelfristig: wirtschaftlichen Faktor (z. B. Rohertrag/Tag) mit klarer Gewichtung in den Score integrieren.
4) Anzeige-Erweiterungen  
   - Nuetzliche Zusatzspalten: letzter Verkaufstag, letzter Wareneingang/Lieferant, ABC-Kennzeichen.  
   - Filial-Split als erweiterte Sicht; Standardansicht bleibt kompakt.
5) Export  
   - CSV/Print reicht fuer den Rollout.  
   - Optional: ERP-Layout wählbar (Spalten/Trennzeichen), echte ERP-Integration als Folgeprojekt.
6) Saisonalitaet  
   - Sommer/Winter-Presets beibehalten; zusaetzlich Warengruppen-spezifische Saisonfenster (Sandale vs. Winterboot).  
   - Optional Uebergangs-Preset (Maerz/Oktober) fuer konservative Bestellungen vor Saisonwechsel.
