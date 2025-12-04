function LifecycleView({ data }) {
  const classCounts = data?.classCounts || {};
  const powerwall = data?.powerwall || [];
  const nachfuellen = data?.nachfuellen || [];
  const reduzieren = data?.reduzieren || [];
  const abcMatrix = data?.abcSummary || {};

  return (
    <section style={sectionStyle}>
      <h2 style={{ marginTop: 0 }}>Sortimentsstatus</h2>
      <div style={cardGrid}>
        {["A1", "A2", "A3", "B", "C"].map((key) => (
          <div key={key} style={cardStyle}>
            <div style={eyebrow}>Klasse {key}</div>
            <div style={{ fontSize: "24px", fontWeight: 800 }}>{classCounts[key] ?? 0}</div>
            <div style={muted}>Umsatzanteil (12M): {formatNumber(classCounts[`sales${key}`])}</div>
          </div>
        ))}
      </div>

      <h3>ABC x Lebensstatus</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cell(true)}>ABC</th>
            {["A1", "A2", "A3", "B", "C"].map((k) => (
              <th key={k} style={cell(true)}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {["A", "B", "C"].map((abc) => (
            <tr key={abc}>
              <td style={cell()}>{abc}</td>
              {["A1", "A2", "A3", "B", "C"].map((k) => (
                <td key={k} style={cell()}>{abcMatrix?.[abc]?.[k] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Powerwall (Top 25 Modelle, 12M)</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {["Modell", "ABC", "Kern-Groessen", "Umsatz 12M", "Bestand"].map((h) => (
                <th key={h} style={cell(true)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {powerwall.map((p) => (
              <tr key={p.model}>
                <td style={cell()}>{p.model}</td>
                <td style={cell()}>{p.abcClass || "-"}</td>
                <td style={cell()}>{formatCoverage(p.coreCoverage)}</td>
                <td style={cell()}>{formatNumber(p.totalSales12M)}</td>
                <td style={cell()}>{formatNumber(p.totalStock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={twoCol}>
        <div>
          <h3>Nachfuellen</h3>
          <TableList rows={nachfuellen} />
        </div>
        <div>
          <h3>Reduzieren</h3>
          <TableList rows={reduzieren} />
        </div>
      </div>
    </section>
  );
}

function TableList({ rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {["Modell", "Variante", "Groesse", "Lager", "ABC", "Klasse", "Bestand", "Meldebestand", "Order", "Letzter Verkauf", "Verkaeufe 12M"].map((h) => (
              <th key={h} style={cell(true)}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r, idx) => (
            <tr key={r.sku || `${r.model}-${idx}`}>
              <td style={cell()}>{r.model}</td>
              <td style={cell()}>{r.variant}</td>
              <td style={cell()}>{r.size}</td>
              <td style={cell()}>{r.lager}</td>
              <td style={cell()}>{r.abcClass || "-"}</td>
              <td style={cell()}>{r.skuClass || "-"}</td>
              <td style={cell()}>{formatNumber(r.stock)}</td>
              <td style={cell()}>{formatDecimal(r.reorderPoint)}</td>
              <td style={cell()}>{formatNumber(r.orderQty)}</td>
              <td style={cell()}>{formatDateLocal(r.lastSaleDate)}</td>
              <td style={cell()}>{formatNumber(r.sales12M)}</td>
            </tr>
          ))}
          {!rows?.length && (
            <tr>
              <td style={cell()} colSpan={11}>Keine Daten</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return Math.round(num * 100) / 100;
}

function formatDecimal(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toFixed(1);
}

function formatDateLocal(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "-";
  try {
    return value.toLocaleDateString("de-DE");
  } catch (e) {
    return value.toISOString().slice(0, 10);
  }
}

function formatCoverage(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const pct = Math.round(Number(value) * 100);
  return `${pct}%`;
}

const sectionStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "16px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "12px",
  backgroundColor: "#f9fafb",
};

const eyebrow = {
  fontSize: "12px",
  textTransform: "uppercase",
  color: "#6b7280",
  letterSpacing: "0.08em",
  fontWeight: 700,
};

const muted = { color: "#6b7280", fontSize: "12px" };

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const cell = (isHeader = false) => ({
  padding: "8px 10px",
  textAlign: "left",
  backgroundColor: isHeader ? "#f3f4f6" : "transparent",
  fontWeight: isHeader ? 700 : 400,
  borderBottom: "1px solid #e5e7eb",
});

const twoCol = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

export default LifecycleView;
