import { useMemo, useState } from "react";
import { logDebug } from "../../utils/debug";
import { mapStatus } from "../../utils/statusMapping";

function OrderListView({ suggestions, periodLabel }) {
  const [onlyTop, setOnlyTop] = useState(false);
  const [onlyGaps, setOnlyGaps] = useState(false);

  const filtered = useMemo(() => {
    const list = Array.isArray(suggestions) ? suggestions : [];
    return list.filter((model) => {
      if (onlyTop && !model.hasTopSeller) return false;
      if (onlyGaps && (model.totalOrderQty ?? 0) <= 0) return false;
      return true;
    });
  }, [suggestions, onlyTop, onlyGaps]);

  logDebug("[DEBUG][OrderListView]", { total: suggestions?.length || 0, filtered: filtered.length });

  const csvData = useMemo(() => buildCsvRows(filtered), [filtered]);

  const handleCsvExport = () => {
    const header = [
      "Modell",
      "Lager",
      "Farbe",
      "Leiste",
      "Groesse",
      "Verkaeufe (Zeitraum)",
      "Bestand",
      "Mindestbestand (Empfehlung)",
      "Empfohlene Bestellmenge",
      "Status",
    ];
    const lines = [header.join(";")].concat(
      csvData.map((row) =>
        [
          row.model,
          row.lager,
          row.variant,
          row.last,
          row.size,
          row.salesQty ?? "",
          row.stockQty ?? "",
          row.reorderPoint ?? "",
          row.orderQty,
          row.status ?? "",
        ].join(";"),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bestellliste_${(periodLabel || "zeitraum").replace(/\\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section style={sectionStyle}>
      <div style={headerRow}>
        <div>
          <div style={eyebrow}>Bestellliste</div>
          <h2 style={titleStyle}>Empfohlene Nachbestellungen</h2>
          <div style={subtleText}>Zeitraum: {periodLabel || "gewaehlter Zeitraum"}</div>
          <div style={subtleText}>
            Hinweis: Bestellvorschlaege basieren auf der durchschnittlichen Nachfrage der letzten 30 Tage.
            Die ausgewaehlte Periode beeinflusst die KPI-Anzeige, nicht den Meldebestand.
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={handleCsvExport} style={linkButtonStyle}>
            Als CSV exportieren
          </button>
          <button type="button" onClick={handlePrint} style={linkButtonStyle}>
            Als PDF/Print exportieren
          </button>
        </div>
      </div>

      <div style={filterBar}>
        <label style={checkboxLabel}>
          <input type="checkbox" checked={onlyTop} onChange={(e) => setOnlyTop(e.target.checked)} />
          Nur Top-Seller-Modelle
        </label>
        <label style={checkboxLabel}>
          <input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} />
          Nur Modelle mit Engpaessen
        </label>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filtered.map((model) => (
          <div key={model.model} style={cardStyle}>
            <div style={cardHeader}>
              <div style={{ fontWeight: 800 }}>{model.model}</div>
              <div style={{ color: "#6b7280" }}>
                Lager: {model.lager || "-"} · {model.totalOrderQty} Paare nachbestellen
              </div>
            </div>
            <ModelMatrixBlock model={model} />
          </div>
        ))}
        {!filtered.length && <div style={emptyStyle}>Keine Modelle mit Bestellbedarf im Zeitraum.</div>}
      </div>
    </section>
  );
}

function ModelMatrixBlock({ model }) {
  const sizeHeaders = useMemo(() => {
    const sizes = new Set();
    model.variants.forEach((variant) => {
      variant.leiste.forEach((entry) => {
        entry.sizes.filter((s) => s.orderQty > 0).forEach((s) => sizes.add(s.size));
      });
    });
    return Array.from(sizes).sort(sizeSort);
  }, [model]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cellStyle(true)}>Farbe · Leiste</th>
            {sizeHeaders.map((size) => (
              <th key={size} style={cellStyle(true)}>
                {size}
              </th>
            ))}
            <th style={cellStyle(true)}>Summe</th>
          </tr>
        </thead>
        <tbody>
          {model.variants.map((variant) =>
            variant.leiste.map((entry) => {
              const rowTotal = entry.sizes.reduce((sum, s) => sum + (Number(s.orderQty) || 0), 0);
              if (rowTotal <= 0) return null;
              const status = mapStatus(entry.statusKey);
              return (
                <tr key={`${variant.variant}-${entry.last}`} style={rowStyle}>
                  <td style={cellStyle()}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <StatusTag statusKey={entry.statusKey} />
                      <span>{variant.variant} · {entry.last}</span>
                    </div>
                  </td>
                  {sizeHeaders.map((size) => {
                    const sizeEntry = entry.sizes.find((s) => s.size === size);
                    const qty = sizeEntry?.orderQty || "";
                    const bestellmenge = formatOrderQty(qty);
                    const metaSegments = [
                      {
                        label: "Bestand",
                        value: formatNumber(sizeEntry?.stockQty),
                        title: "Aktueller Bestand im Lager",
                      },
                      {
                        label: "Meldebestand",
                        value: formatDecimal(sizeEntry?.reorderPoint),
                        title: "Berechneter Bestand, ab dem nachbestellt werden sollte (inkl. Sicherheitsbestand).",
                      },
                      {
                        label: "Reichweite",
                        value: formatDocLabel(sizeEntry?.daysOfCover, sizeEntry?.stockQty),
                        title: "Geschaetzte Anzahl Tage, die der aktuelle Bestand bei aktueller Nachfrage noch reicht.",
                      },
                      {
                        label: "Verkaeufe im Zeitraum",
                        value: formatNumber(sizeEntry?.salesQty),
                        title: "Verkaufte Menge im ausgewaehlten Zeitraum.",
                      },
                      {
                        label: "Ø Paare/Tag",
                        value: formatAvgDaily(sizeEntry?.avgDailySales),
                        title: "Durchschnittlich verkaufte Paare pro Tag im Zeitraum.",
                      },
                      {
                        label: "Letzter Verkauf",
                        value: formatDateLocal(sizeEntry?.lastSaleDate),
                        title: "Datum der letzten verkauften Einheit dieser Groesse in diesem Lager.",
                      },
                    ];
                    return (
                      <td key={size} style={cellStyle()}>
                        {qty ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <strong title="Vom System empfohlene Nachbestellmenge fuer diese Groesse.">
                              Bestellmenge: {bestellmenge}
                            </strong>
                            <span style={metaText}>
                              {metaSegments.map((seg, idx) => (
                                <span key={seg.label} title={seg.title} style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                                  <span style={{ fontWeight: 600 }}>{seg.label}:</span>
                                  <span>{seg.value}</span>
                                  {idx < metaSegments.length - 1 ? <span aria-hidden="true">·</span> : null}
                                </span>
                              ))}
                            </span>
                          </div>
                        ) : (
                          ""
                        )}
                      </td>
                    );
                  })}
                  <td style={{ ...cellStyle(), fontWeight: 700 }}>{formatNumber(rowTotal)}</td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}

function buildCsvRows(models) {
  const rows = [];
  models.forEach((model) => {
    model.variants.forEach((variant) => {
      variant.leiste.forEach((entry) => {
        entry.sizes
          .filter((s) => s.orderQty > 0)
          .forEach((sizeEntry) => {
            rows.push({
              model: model.model,
              lager: model.lager,
              variant: variant.variant,
              last: entry.last,
              size: sizeEntry.size,
              orderQty: toNumberOrBlank(sizeEntry.orderQty),
              salesQty: toNumberOrBlank(entry.salesQty),
              stockQty: toNumberOrBlank(entry.stockQty),
              reorderPoint: toNumberOrBlank(entry.reorderPoint),
              status: mapStatus(entry.statusKey).label,
            });
          });
      });
    });
  });
  return rows;
}

function StatusTag({ statusKey }) {
  const status = mapStatus(statusKey);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: pickStatusColor(statusKey), fontWeight: 700 }}>
      <span aria-hidden>{status.icon}</span>
      <span>{status.label}</span>
    </span>
  );
}

function pickStatusColor(statusKey) {
  if (statusKey === "REORDER") return "#b91c1c";
  if (statusKey === "HOT_SELLER") return "#b91c1c";
  if (statusKey === "LOW") return "#b45309";
  if (statusKey === "OOS_INACTIVE") return "#6b7280";
  return "#166534";
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return typeof value === "number" ? value : Number(value);
}

function formatDecimal(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toFixed(decimals);
}

function formatAvgDaily(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toFixed(2);
}

function formatDocLabel(value, stockQty) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    if (stockQty === 0) return "ausverkauft";
    return "-";
  }
  const num = Math.round(value);
  if (num <= 0) return "0 (ausverkauft)";
  return `${num} Tage`;
}

function formatDateLocal(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "-";
  try {
    return value.toLocaleDateString("de-DE");
  } catch (e) {
    return value.toISOString().slice(0, 10);
  }
}

function formatOrderQty(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${num} Paar`;
}

function toNumberOrBlank(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : "";
}

function sizeSort(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b), "de");
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  marginTop: "6px",
};

const cellStyle = (isHeader = false) => ({
  padding: "8px 10px",
  textAlign: "left",
  backgroundColor: isHeader ? "#f3f4f6" : "transparent",
  fontWeight: isHeader ? 700 : 400,
  borderBottom: "1px solid #e5e7eb",
});

const sectionStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "16px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" };
const eyebrow = { fontSize: "12px", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.08em", fontWeight: 700 };
const titleStyle = { margin: "0 0 4px 0" };
const subtleText = { fontSize: "13px", color: "#6b7280" };
const linkButtonStyle = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#111827",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
const filterBar = {
  margin: "12px 0",
  padding: "10px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};
const checkboxLabel = { display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 };
const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "12px",
  backgroundColor: "#f9fafb",
};
const cardHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" };
const rowStyle = {
  borderTop: "1px solid #e5e7eb",
};
const emptyStyle = { padding: "12px", border: "1px dashed #d1d5db", color: "#6b7280", borderRadius: "8px" };
const metaText = { fontSize: "11px", color: "#6b7280" };

export default OrderListView;




