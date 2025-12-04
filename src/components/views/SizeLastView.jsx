import { useEffect, useMemo, useState } from "react";
import { logDebug } from "../../utils/debug";

function SizeLastView({ aggregates, onSelectSize, onSelectLast, periodLabel }) {
  const [tab, setTab] = useState("sizes");
  const activeRows = useMemo(() => (tab === "sizes" ? aggregates?.sizes : aggregates?.lasts) || [], [tab, aggregates]);

  useEffect(() => {
    logDebug("[DEBUG][SizeLastView]", {
      tab,
      sizes: aggregates?.sizes?.length || 0,
      lasts: aggregates?.lasts?.length || 0,
      activeRows: activeRows.length,
      topSample: activeRows[0]?.key,
      periodLabel,
    });
  }, [tab, aggregates?.sizes?.length, aggregates?.lasts?.length, activeRows.length, activeRows, periodLabel]);

  return (
    <section style={sectionStyle}>
      <div style={headerRow}>
        <div>
          <div style={eyebrow}>Groessen & Leisten</div>
          <h2 style={titleStyle}>Top 20 Groessen & Leisten</h2>
          <div style={subtleText}>
            Zeitraum: {periodLabel || "gewaehlter Zeitraum"} - kumulierte Verkaeufe und Bestand nach Groesse/Leiste.
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={() => setTab("sizes")} style={tabButton(tab === "sizes")}>
            Top 20 Groessen
          </button>
          <button type="button" onClick={() => setTab("lasts")} style={tabButton(tab === "lasts")}>
            Top 20 Leisten
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={cellStyle(true)}>{tab === "sizes" ? "Groesse" : "Leiste"}</th>
              <th style={cellStyle(true)}>Verkaeufe (Zeitraum)</th>
              <th style={cellStyle(true)}>Ø Verkaeufe/Monat</th>
              <th style={cellStyle(true)}>Gesamtbestand</th>
              <th style={cellStyle(true)}>Mindestbestand (Empfehlung)</th>
              <th style={cellStyle(true)}>Status</th>
              <th style={cellStyle(true)}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row, idx) => (
              <tr key={row.key || idx} style={rowStyle(idx)}>
                <td style={cellStyle()}>{row.key}</td>
                <td style={cellStyle()}>{formatNumber(row.salesQty)}</td>
                <td style={cellStyle()}>{formatNumber(Math.round(row.avgMonthlySales))}</td>
                <td style={cellStyle()}>{formatNumber(row.stockQty)}</td>
                <td style={cellStyle()}>{formatNumber(Math.round(row.reorderPoint))}</td>
                <td style={cellStyle()}>
                  <StatusPill status={row.status} />
                </td>
                <td style={cellStyle()}>
                  <button
                    type="button"
                    onClick={() => (tab === "sizes" ? onSelectSize?.(row.key) : onSelectLast?.(row.key))}
                    style={linkButtonStyle}
                  >
                    Details ansehen
                  </button>
                </td>
              </tr>
            ))}
            {!activeRows.length && (
              <tr>
                <td style={cellStyle()} colSpan={7}>
                  Keine Daten im Zeitraum gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
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
        padding: "6px 10px",
        borderRadius: "999px",
        backgroundColor: tone.bg,
        color: tone.text,
        fontWeight: 800,
      }}
    >
      {status?.label || "OK"}
    </span>
  );
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
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" };
const eyebrow = { fontSize: "12px", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.08em", fontWeight: 700 };
const titleStyle = { margin: "0 0 4px 0" };
const subtleText = { fontSize: "13px", color: "#6b7280" };
const tabButton = (active) => ({
  padding: "10px 12px",
  borderRadius: "10px",
  border: active ? "2px solid #111827" : "1px solid #d1d5db",
  backgroundColor: active ? "#111827" : "#fff",
  color: active ? "#fff" : "#111827",
  fontWeight: 800,
  cursor: "pointer",
});

const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "14px", marginTop: "12px" };
const cellStyle = (isHeader = false) => ({
  padding: "10px 12px",
  textAlign: "left",
  backgroundColor: isHeader ? "#f3f4f6" : "transparent",
  fontWeight: isHeader ? 700 : 400,
  borderBottom: "1px solid #e5e7eb",
});
const rowStyle = (idx) => ({ backgroundColor: idx % 2 === 0 ? "#fcfcfc" : "#fff" });

const linkButtonStyle = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#111827",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

export default SizeLastView;
