import { useEffect, useMemo, useState } from "react";
import { groupTopSellersByModel } from "../../utils/viewSelectors";
import { logDebug } from "../../utils/debug";

function TopSellerView({ rows, modelInsights, focusFilters, onClearFocus, periodLabel }) {
  const [onlyOos, setOnlyOos] = useState(false);
  const [grouped, setGrouped] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (focusFilters && Object.keys(focusFilters).length) {
      setGrouped(false);
      setOnlyOos(false);
    }
  }, [focusFilters]);

  const filteredRows = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return list.filter((row) => {
      const isOos = row.stockQty === 0 || row?.kpi?.isOOS;
      if (onlyOos && !isOos) return false;
      if (focusFilters?.size && row.size !== focusFilters.size) return false;
      if (focusFilters?.last && row.last !== focusFilters.last) return false;
      if (focusFilters?.variant && row.variant !== focusFilters.variant) return false;
      if (focusFilters?.model && row.model !== focusFilters.model) return false;
      if (search) {
        const needle = search.toLowerCase();
        const haystack = `${row.model} ${row.variant} ${row.size}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, onlyOos, focusFilters, search]);

  const sortedRows = useMemo(() => sortRows(filteredRows, "sales"), [filteredRows]);
  const groupedRows = useMemo(() => groupTopSellersByModel(sortedRows, modelInsights), [sortedRows, modelInsights]);
  const maxSales = useMemo(() => Math.max(1, ...sortedRows.map((row) => row.salesQty || 0)), [sortedRows]);

  const hasActiveFocus =
    focusFilters?.size || focusFilters?.last || focusFilters?.variant || focusFilters?.model;

  logDebug("[DEBUG][TopSellerView]", {
    periodLabel,
    totalRows: rows?.length || 0,
    filteredRows: filteredRows.length,
    grouped,
    onlyOos,
    focusFilters,
  });

  return (
    <section style={sectionStyle}>
      <div style={headerRow}>
        <div>
          <div style={eyebrow}>Top-Seller</div>
          <h2 style={titleStyle}>Top 100 Topseller</h2>
          <div style={subtleText}>
            Zeitraum: {periodLabel || "Letzte 90 Tage"} · zeigt alle SKUs mit Verkaeufen &gt; 0, sortiert nach Verkaeufen.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
          <label style={checkboxLabel}>
            <input type="checkbox" checked={onlyOos} onChange={(e) => setOnlyOos(e.target.checked)} />
            Nur ausverkaufte zeigen
          </label>
          <label style={checkboxLabel}>
            <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
            Nach Modell zusammenfassen
          </label>
        </div>
      </div>

      <div style={filterBar}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Modell / Farbe / Groesse suchen"
            style={searchInputStyle}
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

      {grouped ? (
        <ModelGroupedTable rows={groupedRows} />
      ) : (
        <TopSellerTable rows={sortedRows} maxSales={maxSales} />
      )}
    </section>
  );
}

function TopSellerTable({ rows, maxSales }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {[
              "Rang",
              "Modell",
              "Variante",
              "Leiste",
              "Groesse",
              "Verkaeufe (Zeitraum)",
              "Ø Verkaeufe/Monat",
              "Bestand",
              "Mindestbestand (Empfehlung)",
              "Status",
            ].map((header) => (
              <th key={header} style={cellStyle(true)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row?.sku || idx} style={rowStyle(idx)}>
              <td style={cellStyle()}>{row.rank}</td>
              <td style={cellStyle()}>{row.model}</td>
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
                <StatusPill status={row.status} />
              </td>
            </tr>
          ))}
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
              "Ø Verkaeufe/Monat",
              "Bestand",
              "Mindestbestand (Empfehlung)",
              "Lueckenindikator",
              "Status",
            ].map((header) => (
              <th key={header} style={cellStyle(true)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row?.model || idx} style={rowStyle(idx)}>
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

export default TopSellerView;
