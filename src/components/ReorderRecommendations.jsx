import { useMemo, useState } from "react";

function ReorderRecommendations({ recommendations }) {
  const rows = Array.isArray(recommendations) ? recommendations : [];
  const [checked, setChecked] = useState(new Set());

  const toggleChecked = (sku) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const data = useMemo(
    () =>
      rows.slice().map((row) => ({
        ...row,
        docLabel:
          row?.daysOfCover == null || Number.isNaN(row.daysOfCover)
            ? "-"
            : `${Math.round(row.daysOfCover)} Tage`,
        salesLabel: row?.verkaufteMengeTotal == null ? "-" : row.verkaufteMengeTotal,
        reasonText: buildReasonText(row),
      })),
    [rows],
  );

  return (
    <section aria-label="Reorder Recommendations" style={{ marginTop: "8px" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {[
              "Model",
              "Variante",
              "Leiste",
              "Groesse",
              "Bestand",
              "Dringlichkeit",
              "Bestand reicht noch",
              "Verkaeufe (30T)",
              "Begruendung",
              "In Bestellung",
            ].map((header) => (
              <th key={header} style={cellStyle(true)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row?.sku || idx} style={rowStyle(idx)}>
              <td style={cellStyle()}>{row?.artikel || "-"}</td>
              <td style={cellStyle()}>{row?.variante || "-"}</td>
              <td style={cellStyle()}>{row?.leiste || "-"}</td>
              <td style={cellStyle()}>{row?.groesse || "-"}</td>
              <td style={cellStyle()}>{formatNumber(row?.bestand)}</td>
              <td style={cellStyle()}>{renderUrgency(row)}</td>
              <td style={cellStyle()} title="Tage, die der aktuelle Bestand noch reicht (Days of Cover)">
                {row.docLabel}
              </td>
              <td style={cellStyle()} title="Verkaeufe im Zeitraum (mind. 30 Tage)">
                {row.salesLabel}
              </td>
              <td style={cellStyle()}>{row.reasonText}</td>
              <td style={cellStyle()}>
                <input
                  type="checkbox"
                  checked={checked.has(row.sku)}
                  onChange={() => toggleChecked(row.sku)}
                  aria-label="In Bestellung markieren"
                />
              </td>
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td style={cellStyle()} colSpan={10}>
                Keine Reorder-Empfehlungen gefunden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

function rowStyle(idx) {
  return {
    backgroundColor: idx % 2 === 0 ? "#fcfcfc" : "#fff",
    transition: "background-color 120ms ease",
  };
}

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

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : String(value);
}

function renderUrgency(row) {
  const type = row?.reason?.type || (row?.isOOS ? "urgent" : row?.isUrgent ? "urgent" : "priority");
  const map = {
    urgent: { bg: "#fee2e2", text: "#b91c1c", label: "Dringend" },
    priority: { bg: "#fef3c7", text: "#b45309", label: "Hoch" },
    monitor: { bg: "#e0f2fe", text: "#0ea5e9", label: "Beobachten" },
  };
  const tone = map[type] || map.priority;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        backgroundColor: tone.bg,
        color: tone.text,
        fontWeight: 700,
        fontSize: "12px",
      }}
    >
      {tone.label}
    </span>
  );
}

function buildReasonText(row) {
  const sales = row?.verkaufteMengeTotal ?? 0;
  const doc = row?.daysOfCover;
  if (row?.isTopSeller && row?.isOOS) {
    return `Top-Seller, jetzt ausverkauft – Bestand 0, ${sales} Verkaeufe im Zeitraum.`;
  }
  if (row?.isOOS) {
    return `Ausverkauft – ${sales} Verkaeufe im Zeitraum.`;
  }
  if (doc != null && Number.isFinite(doc) && doc < 7) {
    const days = Math.max(0, Math.round(doc));
    return `Bestand reicht nur noch ${days} Tage, hohe Nachfrage in Groesse ${row?.groesse || "-"}.`;
  }
  if (row?.isTopSeller) {
    return `Top-Seller mit knappen Bestand – ${sales} Verkaeufe.`;
  }
  return row?.reason?.type ? row.reason.type : "Nachfrage beachten.";
}

export default ReorderRecommendations;
