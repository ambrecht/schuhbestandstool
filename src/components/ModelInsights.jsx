import { useMemo, useState } from "react";

const STATUS_TONES = {
  MISSING_WITH_DEMAND: { bg: "#fee2e2", text: "#b91c1c", label: "Missing w/ Demand" },
  MISSING_NO_DEMAND: { bg: "#e5e7eb", text: "#374151", label: "Missing (no demand)" },
  URGENT_LOW_STOCK: { bg: "#fef3c7", text: "#b45309", label: "Urgent / Low DoC" },
  LOW_STOCK: { bg: "#fffbeb", text: "#92400e", label: "Low Stock" },
  CRITICAL: { bg: "#fde68a", text: "#92400e", label: "Kritischer Restbestand" },
  OK: { bg: "#dcfce7", text: "#166534", label: "OK" },
};

function ModelInsights({ insights }) {
  const grouped = insights?.grouped || {};
  const topSellers = insights?.topSellers || {};
  const missingSizes = insights?.missingSizesHighDemand || insights?.missingSizes || {};

  const modelNames = useMemo(() => Object.keys(grouped).sort(), [grouped]);
  const [selectedModel, setSelectedModel] = useState(() => modelNames[0] || "");

  const model = selectedModel ? grouped[selectedModel] : null;
  const matrix = useMemo(() => buildMatrix(model), [model]);
  const metrics = model
    ? [
        { label: "Total Sales", value: formatNumber(model.totalSales) },
        { label: "Total Stock", value: formatNumber(model.totalStock) },
        { label: "Total SKUs", value: formatNumber(model.totalSkus) },
      ]
    : [];

  return (
    <section aria-label="Model Insights" style={{ marginTop: "16px" }}>
      <div
        style={{
          ...cardStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Model Insights</h2>
          <div style={{ color: "#6b7280", fontSize: "13px" }}>artikel &gt; variante &gt; leiste &gt; groesse</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontWeight: 600 }}>Modell:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!modelNames.length}
          >
            {modelNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={cardStyle}>
        {model ? (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              {metrics.map((m) => (
                <div
                  key={m.label}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#fff",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>{m.label}</div>
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>Keine Modelle verfuegbar.</div>
        )}
      </div>

      {model && (
        <>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "8px" }}>Matrix (Variante x Leiste x Groesse)</h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
              <LegendItem tone={STATUS_TONES.OK} />
              <LegendItem tone={STATUS_TONES.CRITICAL} />
              <LegendItem tone={STATUS_TONES.LOW_STOCK} />
              <LegendItem tone={STATUS_TONES.URGENT_LOW_STOCK} />
              <LegendItem tone={STATUS_TONES.MISSING_WITH_DEMAND} />
              <LegendItem tone={STATUS_TONES.MISSING_NO_DEMAND} />
            </div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={cellStyle(true)}>Variante</th>
                  <th style={cellStyle(true)}>Leiste</th>
                  {matrix.columns.map((size) => (
                    <th key={size} style={cellStyle(true)}>
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row, idx) => (
                  <tr key={`${row.variant}-${row.leiste}`} style={rowStyle(idx)}>
                    <td style={cellStyle()}>{row.variant}</td>
                    <td style={cellStyle()}>{row.leiste}</td>
                    {matrix.columns.map((size) => (
                      <td key={size} style={cellStyle()}>
                        {renderMatrixCell(row.sizes[size])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: "8px" }}>Top Seller</h3>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {["#", "SKU", "Variante", "Leiste", "Groesse", "Verkaeufe", "Sell-Through", "DoC"].map(
                      (header) => (
                        <th key={header} style={cellStyle(true)}>
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(topSellers[selectedModel] || []).map((item, idx) => (
                    <tr key={item.sku || idx} style={rowStyle(idx)}>
                      <td style={cellStyle()}>{item.rank}</td>
                      <td style={cellStyle()}>{item.sku}</td>
                      <td style={cellStyle()}>{item.variante}</td>
                      <td style={cellStyle()}>{item.leiste}</td>
                      <td style={cellStyle()}>{item.groesse}</td>
                      <td style={cellStyle()}>{formatNumber(item.verkaufteMengeTotal)}</td>
                      <td style={cellStyle()}>{formatSellThrough(item.sellThrough)}</td>
                      <td style={cellStyle()}>{formatDaysOfCover(item.daysOfCover)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: "8px" }}>Fehlende / kritische Groessen</h3>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {["Variante", "Leiste", "Groesse", "Bestand", "Verkaeufe", "DoC", "Reason"].map(
                      (header) => (
                        <th key={header} style={cellStyle(true)}>
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(missingSizes[selectedModel] || []).map((item, idx) => (
                    <tr key={`${item.sku || item.groesse || idx}-${idx}`} style={rowStyle(idx)}>
                      <td style={cellStyle()}>{item.variante}</td>
                      <td style={cellStyle()}>{item.leiste}</td>
                      <td style={cellStyle()}>{item.groesse}</td>
                      <td style={cellStyle()}>{formatNumber(item.bestand)}</td>
                      <td style={cellStyle()}>{formatNumber(item.verkaufteMengeTotal)}</td>
                      <td style={cellStyle()}>{formatDaysOfCover(item.daysOfCover)}</td>
                      <td style={cellStyle()}>{item.reason || item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function buildMatrix(model) {
  if (!model) return { columns: [], rows: [] };

  const columnsSet = new Set();
  const rows = [];

  for (const variantName of Object.keys(model.variants || {})) {
    const variant = model.variants[variantName];

    for (const leisteName of Object.keys(variant.leiste || {})) {
      const leiste = variant.leiste[leisteName];
      const sizes = {};

      for (const size of Object.keys(leiste.sizes || {})) {
        columnsSet.add(size);
        sizes[size] = {
          value: leiste.sizes[size].bestand ?? "-",
          status: leiste.sizes[size].status,
          isCriticalQty: leiste.sizes[size].isCriticalQty,
          isOOS: leiste.sizes[size].isOOS,
        };
      }

      rows.push({
        variant: variantName,
        leiste: leisteName,
        sizes,
      });
    }
  }

  const columns = Array.from(columnsSet);
  columns.sort((a, b) => String(a).localeCompare(String(b), "de"));

  return { columns, rows };
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  marginTop: "8px",
};

const cardStyle = {
  padding: "20px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  backgroundColor: "#fff",
};

function cellStyle(isHeader = false) {
  return {
    padding: "8px 12px",
    textAlign: "left",
    position: isHeader ? "sticky" : undefined,
    top: isHeader ? 0 : undefined,
    backgroundColor: isHeader ? "#fafafa" : "transparent",
    fontWeight: isHeader ? 600 : 400,
    borderBottom: "1px solid #e5e7eb",
  };
}

function rowStyle(idx) {
  return {
    backgroundColor: idx % 2 === 0 ? "#fcfcfc" : "#fff",
    transition: "background-color 120ms ease",
  };
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return typeof value === "number" ? value : String(value);
}

function formatSellThrough(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatDaysOfCover(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return Math.round(Number(value));
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return value;
}

function renderMatrixCell(cell) {
  if (!cell) return "-";
  const tone =
    (cell.isOOS && STATUS_TONES.MISSING_WITH_DEMAND) ||
    (cell.isCriticalQty && STATUS_TONES.CRITICAL) ||
    STATUS_TONES[cell.status] ||
    STATUS_TONES.OK;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 8px",
        borderRadius: "6px",
        backgroundColor: tone.bg,
        color: tone.text,
        minWidth: "42px",
        textAlign: "center",
        fontWeight: 700,
      }}
    >
      {formatValue(cell.value)} {cell.isCriticalQty && !cell.isOOS ? "⚠" : ""}
    </span>
  );
}

function LegendItem({ tone }) {
  if (!tone) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "12px",
        color: "#374151",
      }}
    >
      <span
        style={{
          width: "14px",
          height: "14px",
          borderRadius: "4px",
          backgroundColor: tone.bg,
          border: "1px solid rgba(0,0,0,0.05)",
          display: "inline-block",
        }}
      />
      {tone.label}
    </span>
  );
}

export default ModelInsights;
