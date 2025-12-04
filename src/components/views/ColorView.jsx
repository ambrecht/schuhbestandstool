import { useEffect } from "react";
import { logDebug } from "../../utils/debug";

function ColorView({ colors, onSelectColor, periodLabel }) {
  const rows = Array.isArray(colors) ? colors : [];

  useEffect(() => {
    logDebug("[DEBUG][ColorView]", {
      colors: rows.length,
      topVariant: rows[0]?.variant,
      periodLabel,
    });
  }, [rows.length, rows, periodLabel]);

  return (
    <section style={sectionStyle}>
      <div style={headerRow}>
        <div>
          <div style={eyebrow}>Farben</div>
          <h2 style={titleStyle}>Top 20 Farben</h2>
          <div style={subtleText}>
            Zeitraum: {periodLabel || "gewaehlter Zeitraum"} · kumulierte Verkaeufe und Bestand je Farbe/Variante.
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={cellStyle(true)}>Farbe / Variante</th>
              <th style={cellStyle(true)}>Verkaeufe (Zeitraum)</th>
              <th style={cellStyle(true)}>Ø Verkaeufe/Monat</th>
              <th style={cellStyle(true)}>Gesamtbestand</th>
              <th style={cellStyle(true)}>Mindestbestand (Empfehlung)</th>
              <th style={cellStyle(true)}>Modelle mit fehlenden Groessen</th>
              <th style={cellStyle(true)}>Status</th>
              <th style={cellStyle(true)}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.variant || idx} style={rowStyle(idx)}>
                <td style={cellStyle()}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={colorSwatch(idx)} aria-hidden />
                    <div>
                      <div style={{ fontWeight: 800 }}>{row.variant}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {formatNumber(row.salesQty)} Verkaeufe
                      </div>
                    </div>
                  </div>
                </td>
                <td style={cellStyle()}>{formatNumber(row.salesQty)}</td>
                <td style={cellStyle()}>{formatNumber(Math.round(row.avgMonthlySales))}</td>
                <td style={cellStyle()}>{formatNumber(row.stockQty)}</td>
                <td style={cellStyle()}>{formatNumber(Math.round(row.reorderPoint))}</td>
                <td style={cellStyle()}>{formatNumber(row.modelsWithMissing)}</td>
                <td style={cellStyle()}>
                  <StatusPill status={row.status} />
                </td>
                <td style={cellStyle()}>
                  <button type="button" onClick={() => onSelectColor?.(row.variant)} style={linkButtonStyle}>
                    In Modell-Matrix oeffnen
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td style={cellStyle()} colSpan={8}>
                  Keine Farben im Zeitraum gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function colorSwatch(idx) {
  const palette = ["#0ea5e9", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const color = palette[idx % palette.length];
  return {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: `linear-gradient(135deg, ${color}, #111827)`,
    border: "1px solid rgba(0,0,0,0.06)",
  };
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

export default ColorView;
