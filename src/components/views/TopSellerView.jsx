import { useEffect, useMemo, useRef, useState } from "react";
import { groupTopSellersByModel } from "../../utils/viewSelectors";
import { logDebug } from "../../utils/debug";

function TopSellerView({ rows, modelInsights, focusFilters, onClearFocus, periodLabel }) {
  const [onlyOos, setOnlyOos] = useState(false);
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [onlyTop, setOnlyTop] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const [grouped, setGrouped] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [sortBy, setSortBy] = useState("urgency"); // default: Dringlichkeit
  const [sortDirection, setSortDirection] = useState("desc");
  const detailHeadingRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (focusFilters && Object.keys(focusFilters).length) {
      setGrouped(false);
      setOnlyOos(false);
      setOnlyUrgent(false);
      setOnlyTop(false);
    }
  }, [focusFilters]);

  const handleSortChange = (key) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDirection("desc");
    }
  };

  const handleRowClick = (row) => {
    setSelectedRow(row);
    setDetailTab("overview");
    window.requestAnimationFrame(() => {
      if (detailHeadingRef.current) {
        detailHeadingRef.current.focus();
      }
    });
  };

  const handleCloseDetails = () => {
    setSelectedRow(null);
    setDetailTab("overview");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Pipeline: Focus-Filter -> lokale Filter -> Suche -> Sortierung
  const displayRows = useMemo(() => {
    let list = Array.isArray(rows) ? rows.slice() : [];
    list = applyFocusFilters(list, focusFilters);
    list = applyRowFilters(list, { onlyOos, onlyUrgent, onlyTop });
    list = applySearch(list, search);
    list = sortRowsWithState(list, { sortBy, sortDirection });
    return list;
  }, [rows, focusFilters, onlyOos, onlyUrgent, onlyTop, search, sortBy, sortDirection]);

  const groupedRows = useMemo(
    () => groupTopSellersByModel(displayRows, modelInsights),
    [displayRows, modelInsights],
  );
  const maxSales = useMemo(() => Math.max(1, ...displayRows.map((row) => row.salesQty || 0)), [displayRows]);
  const { activeCount, summaryLabel } = useMemo(
    () => buildActiveSummary({ search, onlyOos, onlyUrgent, onlyTop, focusFilters }),
    [search, onlyOos, onlyUrgent, onlyTop, focusFilters],
  );

  const hasActiveFocus =
    focusFilters?.size || focusFilters?.last || focusFilters?.variant || focusFilters?.model;

  logDebug("[DEBUG][TopSellerView]", {
    periodLabel,
    totalRows: rows?.length || 0,
    filteredRows: displayRows.length,
    grouped,
    onlyOos,
    onlyUrgent,
    onlyTop,
    focusFilters,
    sortBy,
    sortDirection,
  });

  return (
    <section style={sectionStyle}>
      <div style={headerRow}>
        <div>
          <div style={eyebrow}>Top-Seller</div>
          <h2 style={titleStyle}>Top 100 Topseller</h2>
          <div style={subtleText}>
            Zeitraum: {periodLabel || "Letzte 90 Tage"} - zeigt alle SKUs mit Verkaeufen &gt; 0, sortiert nach
            Verkaeufen.
          </div>
        </div>
        <div style={optionsToggleWrap}>
          <div style={optionsToggleRow}>
            <button type="button" onClick={() => setShowOptions((prev) => !prev)} style={optionsToggleButton}>
              {showOptions ? "Optionen ausblenden" : "Optionen einblenden"}
            </button>
            <span style={optionsBadge(activeCount)}>
              {activeCount ? `${activeCount} Filter aktiv` : "Keine Filter aktiv"}
            </span>
          </div>
          {!showOptions && summaryLabel ? <div style={collapsedSummary}>{summaryLabel}</div> : null}
        </div>
      </div>

      {!showOptions ? (
        <div style={collapsedHint}>
          <span>{summaryLabel || "Filter ausgeblendet"}</span>
          <button type="button" onClick={() => setShowOptions(true)} style={optionsToggleButton}>
            Optionen einblenden
          </button>
        </div>
      ) : null}

      {showOptions ? (
        <>
          <div style={optionsBar}>
            <label style={checkboxLabel}>
              <input type="checkbox" checked={onlyOos} onChange={(e) => setOnlyOos(e.target.checked)} />
              Nur ausverkaufte
            </label>
            <label style={checkboxLabel}>
              <input type="checkbox" checked={onlyUrgent} onChange={(e) => setOnlyUrgent(e.target.checked)} />
              Nur dringend
            </label>
            <label style={checkboxLabel}>
              <input type="checkbox" checked={onlyTop} onChange={(e) => setOnlyTop(e.target.checked)} />
              Nur Topseller
            </label>
            <label style={checkboxLabel}>
              <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
              Nach Modell zusammenfassen
            </label>
          </div>

          <div style={filterBar}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Modell / Farbe / Groesse suchen"
                style={searchInputStyle}
                ref={searchInputRef}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              {hasActiveFocus ? (
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  {focusFilters?.model ? <FilterChip label={`Modell: ${focusFilters.model}`} /> : null}
                  {focusFilters?.variant ? <FilterChip label={`Variante: ${focusFilters.variant}`} /> : null}
                  {focusFilters?.size ? <FilterChip label={`Groesse: ${focusFilters.size}`} /> : null}
                  {focusFilters?.last ? <FilterChip label={`Leiste: ${focusFilters.last}`} /> : null}
                  <button type="button" onClick={onClearFocus} style={linkButtonStyle}>
                    Filter zuruecksetzen
                  </button>
                </div>
              ) : (
                <span style={subtleText}>Keine weiteren Filter aktiv</span>
              )}
            </div>
          </div>
        </>
      ) : null}

      {grouped ? (
        <ModelGroupedTable rows={groupedRows} />
      ) : (
        <TopSellerTable
          rows={displayRows}
          maxSales={maxSales}
          onSortChange={handleSortChange}
          onRowClick={handleRowClick}
          selectedRow={selectedRow}
          sortBy={sortBy}
          sortDirection={sortDirection}
        />
      )}

      {selectedRow ? (
        <DetailPanel
          row={selectedRow}
          periodLabel={periodLabel}
          modelInsights={modelInsights}
          activeTab={detailTab}
          onTabChange={setDetailTab}
          onClose={handleCloseDetails}
          headingRef={detailHeadingRef}
        />
      ) : null}
    </section>
  );
}

// rows: Array<{ sku, rank, model, variant, last, size, salesQty, avgMonthlySales, stockQty, reorderPoint, status, kpi? }>
// Flags liegen in row.kpi (isOOS, isUrgent, isLowStock, isTopSeller) und werden fuer die Dringlichkeitsanzeige genutzt.
function TopSellerTable({
  rows,
  maxSales,
  onSortChange,
  onRowClick,
  selectedRow,
  sortBy,
  sortDirection,
}) {
  const columns = [
    { key: "rank", label: "Rang", width: "60px" },
    { key: "model", label: "Modell", width: "180px" },
    { key: "variant", label: "Variante", width: "160px" },
    { key: "last", label: "Leiste", width: "80px" },
    { key: "size", label: "Groesse", width: "80px" },
    { key: "sales", label: "Verkaeufe (Zeitraum)", width: "200px" },
    { key: "avgMonthly", label: "Durchschnitt/Monat", width: "140px" },
    { key: "stock", label: "Bestand", width: "100px" },
    { key: "reorder", label: "Meldebestand", width: "140px" },
    { key: "urgency", label: "Dringlichkeit", width: "160px" },
  ];

  const ariaSort = (key) => {
    if (sortBy !== key) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  };

  const sortIndicator = (key) => {
    if (sortBy !== key) return "";
    return sortDirection === "asc" ? "^" : "v";
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={ariaSort(col.key)}
                style={{ ...cellStyle(true), minWidth: col.width, cursor: "pointer" }}
                onClick={() => onSortChange(col.key)}
              >
                {col.label} {sortIndicator(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isSelected = selectedRow?.sku && row?.sku && selectedRow.sku === row.sku;
            return (
              <tr
                key={row?.sku || idx}
                style={{
                  ...rowStyle(idx),
                  ...(isSelected ? selectedRowStyle : {}),
                  cursor: "pointer",
                  transition: "background-color 120ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eef2ff")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = isSelected
                    ? selectedRowStyle.backgroundColor
                    : rowStyle(idx).backgroundColor)
                }
                onClick={() => onRowClick?.(row)}
              >
              <td style={cellStyle()}>{row.rank}</td>
              <td style={{ ...cellStyle(), fontWeight: 700 }}>{row.model}</td>
              <td style={cellStyle()}>{row.variant}</td>
              <td style={cellStyle()}>{row.last}</td>
              <td style={cellStyle()}>{row.size}</td>
              <td style={cellStyle()}>
                <div style={barRow}>
                  <strong>{formatNumber(row.salesQty)}</strong>
                  <div style={barTrack}>
                    <div
                      style={{
                        ...barFill,
                        width: `${Math.min(100, Math.round((row.salesQty / maxSales) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </td>
              <td style={cellStyle()}>{formatNumber(Math.round(row.avgMonthlySales))}</td>
              <td style={cellStyle()}>{formatNumber(row.stockQty)}</td>
              <td style={cellStyle()}>{formatNumber(Math.round(row.reorderPoint))}</td>
              <td style={cellStyle()}>
                <StatusPill status={buildUrgencyStatus(row)} />
              </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td style={cellStyle()} colSpan={10}>
                Keine Topseller im Zeitraum gefunden. Waehle einen anderen Zeitraum oder hebe Filter auf.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ModelGroupedTable({ rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {[
              "Rang",
              "Modell",
              "Verkaeufe (Zeitraum)",
              "Durchschnitt/Monat",
              "Bestand",
              "Mindestbestand (Empfehlung)",
              "Lueckenindikator",
              "Status",
            ].map((header) => (
              <th key={header} scope="col" style={cellStyle(true)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row?.model || idx}
              style={{ ...rowStyle(idx), cursor: "pointer", transition: "background-color 120ms ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eef2ff")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = rowStyle(idx).backgroundColor)}
            >
              <td style={cellStyle()}>{row.rank}</td>
              <td style={cellStyle()}>{row.model}</td>
              <td style={cellStyle()}>{formatNumber(row.modelSales)}</td>
              <td style={cellStyle()}>{formatNumber(Math.round(row.modelAvgMonthlySales))}</td>
              <td style={cellStyle()}>{formatNumber(row.modelStock)}</td>
              <td style={cellStyle()}>{formatNumber(Math.round(row.modelMinStock))}</td>
              <td style={cellStyle()}>{row.gapSummary}</td>
              <td style={cellStyle()}>
                <StatusPill status={row.status} />
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td style={cellStyle()} colSpan={8}>
                Keine Modelle mit Topsellern gefunden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetailPanel({ row, periodLabel, modelInsights, activeTab, onTabChange, onClose, headingRef }) {
  const status = buildUrgencyStatus(row);
  const doc = row?.kpi?.daysOfCover ?? row?.kpi?.doc ?? null; // wird nur angezeigt, nicht neu berechnet
  const orderQty = row?.kpi?.orderQty; // falls buildTopSellerRows es nicht liefert, bleibt dies undefined
  const insights = getInsightsForRow(row, modelInsights);
  const missingSizes = insights.missingSizes.slice(0, 3);

  return (
    <div style={detailPanelStyle} aria-label="Details zu ausgewähltem Artikel">
      <div style={detailHeader}>
        <h3
          ref={headingRef}
          tabIndex={-1}
          style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}
        >
          Details zu {row.model} / {row.variant} – Leiste {row.last}, Gr. {row.size}
        </h3>
        <button type="button" onClick={onClose} style={linkButtonStyle}>
          Details schliessen
        </button>
      </div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <StatusPill status={status} />
        <span style={subtleText}>Zeitraum: {periodLabel || "Auswahl"}</span>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
        <MetricCard label="Verkaeufe (Zeitraum)" value={formatNumber(row.salesQty)} />
        <MetricCard label="Durchschnitt/Monat" value={formatNumber(Math.round(row.avgMonthlySales))} />
        <MetricCard label="Bestand" value={formatNumber(row.stockQty)} />
        <MetricCard label="Meldebestand" value={formatNumber(Math.round(row.reorderPoint))} />
        <MetricCard label="Reichweite (DoC)" value={doc !== null && doc !== undefined ? formatNumber(Math.round(doc)) : "-"} />
        <MetricCard
          label="Bestellmenge"
          value={orderQty !== undefined ? formatNumber(orderQty) : "-"}
          hint={orderQty === undefined ? "OrderQty nicht in TopSellerRow geliefert; Bestellliste zeigt volle Empfehlung." : null}
        />
      </div>

      <p style={{ marginTop: "10px", marginBottom: "6px" }}>
        Bei der aktuellen Nachfrage ist dieser Schuh in ca.{" "}
        {doc !== null && doc !== undefined ? `${formatNumber(Math.round(doc))} Tagen` : "N/A"} ausverkauft. Bestand liegt
        bei {formatNumber(row.stockQty)}, Meldebestand bei {formatNumber(Math.round(row.reorderPoint))}.{" "}
        Bestellvorschlag: {orderQty !== undefined ? formatNumber(orderQty) : "in Bestellliste einsehen"}.
      </p>

      {missingSizes.length ? (
        <div style={insightBoxStyle}>
          <strong>Fehlende Groessen mit Nachfrage im Modell:</strong>{" "}
          {missingSizes.join(", ")}
        </div>
      ) : null}

      <div style={tabRow}>
        <button
          type="button"
          style={{ ...tabButtonStyle, ...(activeTab === "overview" ? tabButtonActiveStyle : {}) }}
          onClick={() => onTabChange("overview")}
        >
          Uebersicht
        </button>
        <button
          type="button"
          style={{ ...tabButtonStyle, ...(activeTab === "raw" ? tabButtonActiveStyle : {}) }}
          onClick={() => onTabChange("raw")}
        >
          Rohdaten
        </button>
      </div>

      {activeTab === "overview" ? (
        <div style={overviewStyle}>
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            <li>Modell: {row.model}, Variante: {row.variant}, Leiste: {row.last}, Groesse: {row.size}</li>
            <li>Dringlichkeit: {status?.label || "n/a"}</li>
            <li>Verkaeufe im Zeitraum: {formatNumber(row.salesQty)}</li>
            <li>Bestand: {formatNumber(row.stockQty)}, Meldebestand: {formatNumber(Math.round(row.reorderPoint))}</li>
            <li>Durchschnitt/Monat: {formatNumber(Math.round(row.avgMonthlySales))}</li>
            <li>Reichweite (DoC): {doc !== null && doc !== undefined ? formatNumber(Math.round(doc)) : "-"}</li>
          </ul>
        </div>
      ) : (
        <div style={rawStyle}>
          <pre style={preStyle}>{JSON.stringify(row, null, 2)}</pre>
          <button
            type="button"
            style={linkButtonStyle}
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(JSON.stringify(row, null, 2));
              }
            }}
          >
            JSON kopieren
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div style={metricCardStyle}>
      <div style={{ fontSize: "12px", color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 800 }}>{value}</div>
      {hint ? <div style={{ fontSize: "12px", color: "#6b7280" }}>{hint}</div> : null}
    </div>
  );
}

function StatusPill({ status }) {
  const tones = {
    red: { bg: "#fee2e2", text: "#b91c1c" },
    amber: { bg: "#fef3c7", text: "#92400e" },
    green: { bg: "#dcfce7", text: "#166534" },
  };
  const tone = tones[status?.tone] || tones.green;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: "999px",
        backgroundColor: tone.bg,
        color: tone.text,
        fontWeight: 800,
        minWidth: "140px",
        justifyContent: "center",
        border: `1px solid ${tone.text}20`,
      }}
    >
      {status?.label || "OK"}
    </span>
  );
}

// Baut eine kombinierte Dringlichkeits-Anzeige aus vorhandenen Flags.
function buildUrgencyStatus(row) {
  const isOOS = row?.kpi?.isOOS || row?.stockQty === 0;
  const isUrgent = row?.kpi?.isUrgent;
  const isLow = row?.kpi?.isLowStock;
  const isTop = row?.kpi?.isTopSeller;

  if (isOOS && isTop) return { label: "Urgent Topseller", tone: "red" };
  if (isOOS) return { label: "Ausverkauft", tone: "red" };
  if (isUrgent || isLow) return { label: isTop ? "Urgent Topseller" : "Dringend", tone: "amber" };
  return { label: isTop ? "Monitor Topseller" : "Monitor", tone: "green" };
}

function FilterChip({ label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: "999px",
        backgroundColor: "#e0f2fe",
        color: "#0f172a",
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

function getInsightsForRow(row, modelInsights) {
  const grouped = modelInsights?.grouped || {};
  const model = grouped?.[row?.model];
  const variant = model?.variants?.[row?.variant];
  const last = variant?.leiste?.[row?.last];
  const sizeCell = last?.sizes?.[row?.size];

  const missingSizes = [];
  if (model?.variants) {
    for (const variantEntry of Object.values(model.variants)) {
      for (const lastEntry of Object.values(variantEntry.leiste || {})) {
        for (const [sizeKey, cell] of Object.entries(lastEntry.sizes || {})) {
          if (cell?.status === "MISSING_WITH_DEMAND") missingSizes.push(sizeKey);
        }
      }
    }
  }

  return { model, variant, last, sizeCell, missingSizes };
}

// UND-Verknuepfung: Alle gesetzten Filter (OOS/Urgent/Topseller) muessen erfuellt sein.
function applyRowFilters(list, { onlyOos, onlyUrgent, onlyTop }) {
  return list.filter((row) => {
    const kpi = row?.kpi || {};
    if (onlyOos && !(kpi.isOOS || row.stockQty === 0)) return false;
    if (onlyUrgent && !kpi.isUrgent) return false;
    if (onlyTop && !kpi.isTopSeller) return false;
    return true;
  });
}

function applyFocusFilters(list, focusFilters) {
  if (!focusFilters || !Object.keys(focusFilters).length) return list;
  return list.filter((row) => {
    if (focusFilters.size && row.size !== focusFilters.size) return false;
    if (focusFilters.last && row.last !== focusFilters.last) return false;
    if (focusFilters.variant && row.variant !== focusFilters.variant) return false;
    if (focusFilters.model && row.model !== focusFilters.model) return false;
    return true;
  });
}

function applySearch(list, term) {
  const needle = String(term || "").trim().toLowerCase();
  if (!needle) return list;
  return list.filter((row) => {
    const haystack = `${row.model} ${row.variant} ${row.last} ${row.size}`.toLowerCase();
    return haystack.includes(needle);
  });
}

function buildActiveSummary({ search, onlyOos, onlyUrgent, onlyTop, focusFilters }) {
  const labels = [];
  if (onlyOos) labels.push("Nur ausverkaufte");
  if (onlyUrgent) labels.push("Nur dringend");
  if (onlyTop) labels.push("Nur Topseller");
  if (search) labels.push(`Suche \"${search}\"`);
  if (focusFilters?.model) labels.push(`Modell ${focusFilters.model}`);
  if (focusFilters?.variant) labels.push(`Variante ${focusFilters.variant}`);
  if (focusFilters?.size) labels.push(`Groesse ${focusFilters.size}`);
  if (focusFilters?.last) labels.push(`Leiste ${focusFilters.last}`);

  return {
    activeCount: labels.length,
    summaryLabel: labels.join(" · "),
  };
}

function sortRowsWithState(list, { sortBy, sortDirection }) {
  const dir = sortDirection === "asc" ? 1 : -1;
  const urgencyRank = (row) => {
    const s = buildUrgencyStatus(row)?.label || "";
    if (s.toLowerCase().includes("urgent")) return 3;
    if (s.toLowerCase().includes("ausverkauft")) return 3;
    if (s.toLowerCase().includes("dringend")) return 2;
    return 1;
  };

  const sorted = [...list].sort((a, b) => {
    if (sortBy === "urgency") {
      const u = urgencyRank(a) - urgencyRank(b);
      if (u !== 0) return u * dir;
      return (b.salesQty ?? 0) - (a.salesQty ?? 0);
    }
    if (sortBy === "sales") return ((a.salesQty ?? 0) - (b.salesQty ?? 0)) * dir;
    if (sortBy === "avgMonthlySales") return ((a.avgMonthlySales ?? 0) - (b.avgMonthlySales ?? 0)) * dir;
    if (sortBy === "stock") return ((a.stockQty ?? 0) - (b.stockQty ?? 0)) * dir;
    if (sortBy === "reorderPoint") return ((a.reorderPoint ?? 0) - (b.reorderPoint ?? 0)) * dir;
    if (sortBy === "model") return a.model.localeCompare(b.model, "de") * dir;
    return ((a.salesQty ?? 0) - (b.salesQty ?? 0)) * dir;
  });

  return sorted;
}

// Reihenfolge der Pipeline:
// 1) Focus-Filter (size, last, variant, model)
// 2) Lokale Filter (onlyOos, onlyUrgent, onlyTop) - UND-verknuepft
// 3) Textsuche (model, variant, last, size)
// 4) Sortierung: default urgency -> sales, sonst nach sortBy/sortDirection
// Dringlichkeit wird aus buildUrgencyStatus abgeleitet (OOS/Urgent/Low + TopSeller Flag)

function sortRows(rows, sortKey) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  switch (sortKey) {
    case "gap":
      return list.sort(
        (a, b) =>
          (a.stockQty - a.reorderPoint) - (b.stockQty - b.reorderPoint) ||
          b.salesQty - a.salesQty,
      );
    case "model":
      return list.sort((a, b) => a.model.localeCompare(b.model, "de"));
    case "sales":
    default:
      return list.sort((a, b) => b.salesQty - a.salesQty);
  }
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return typeof value === "number" ? value : Number(value);
}

const sectionStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "16px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};

const titleStyle = {
  margin: "0 0 4px 0",
};

const eyebrow = {
  fontSize: "12px",
  textTransform: "uppercase",
  color: "#6b7280",
  letterSpacing: "0.08em",
  fontWeight: 700,
};

const subtleText = { fontSize: "13px", color: "#6b7280" };

const optionsToggleWrap = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  alignItems: "flex-end",
  position: "sticky",
  top: 0,
  padding: "6px 0",
  backgroundColor: "#fff",
  zIndex: 5,
};

const optionsToggleRow = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  flexWrap: "wrap",
};

const optionsToggleButton = {
  padding: "8px 10px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  backgroundColor: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const optionsBadge = (active) => ({
  padding: "6px 10px",
  borderRadius: "20px",
  backgroundColor: active ? "#e0f2fe" : "#f3f4f6",
  color: active ? "#0369a1" : "#4b5563",
  fontWeight: 700,
});

const collapsedSummary = {
  maxWidth: "360px",
  textAlign: "right",
  color: "#4b5563",
  fontSize: "13px",
};

const collapsedHint = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "10px 12px",
  marginTop: "8px",
  borderRadius: "10px",
  border: "1px dashed #cbd5e1",
  backgroundColor: "#f8fafc",
  color: "#334155",
  fontSize: "13px",
  flexWrap: "wrap",
};

const optionsBar = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  marginTop: "12px",
  backgroundColor: "#f9fafb",
};

const filterBar = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "10px",
  padding: "12px",
  borderRadius: "10px",
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  marginTop: "12px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  marginTop: "12px",
};

const cellStyle = (isHeader = false) => ({
  padding: "10px 12px",
  textAlign: "left",
  backgroundColor: isHeader ? "#f3f4f6" : "transparent",
  fontWeight: isHeader ? 700 : 400,
  borderBottom: "1px solid #e5e7eb",
  position: isHeader ? "sticky" : undefined,
  top: isHeader ? 0 : undefined,
});

const rowStyle = (idx) => ({
  backgroundColor: idx % 2 === 0 ? "#fcfcfc" : "#fff",
});

const selectedRowStyle = {
  backgroundColor: "#e0f2fe",
};

const checkboxLabel = {
  display: "flex",
  gap: "6px",
  alignItems: "center",
  fontSize: "13px",
  color: "#111827",
  fontWeight: 600,
};

const searchInputStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  minWidth: "240px",
};

const selectStyle = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
};

const barRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const barTrack = {
  flex: 1,
  height: "10px",
  borderRadius: "999px",
  backgroundColor: "#e5e7eb",
  overflow: "hidden",
};

const barFill = {
  height: "100%",
  background: "linear-gradient(90deg, #0ea5e9, #0369a1)",
};

const linkButtonStyle = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#111827",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const detailPanelStyle = {
  marginTop: "16px",
  padding: "16px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f8fafc",
};

const detailHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const metricCardStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  minWidth: "140px",
  backgroundColor: "#fff",
};

const insightBoxStyle = {
  marginTop: "10px",
  padding: "10px 12px",
  borderRadius: "10px",
  backgroundColor: "#fff7ed",
  border: "1px solid #f59e0b30",
};

const tabRow = {
  display: "flex",
  gap: "8px",
  marginTop: "12px",
};

const tabButtonStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#f3f4f6",
  cursor: "pointer",
};

const tabButtonActiveStyle = {
  backgroundColor: "#111827",
  color: "#fff",
  borderColor: "#111827",
};

const overviewStyle = {
  marginTop: "10px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#fff",
};

const rawStyle = {
  marginTop: "10px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#fff",
};

const preStyle = {
  maxHeight: "240px",
  overflow: "auto",
  backgroundColor: "#0b1221",
  color: "#e5e7eb",
  padding: "10px",
  borderRadius: "8px",
  fontFamily: "Menlo, Consolas, monospace",
  fontSize: "12px",
};

export default TopSellerView;
