import { Fragment, useState } from "react";

function KpiTable({ kpis, columns, expandable = false, renderDetails }) {
  const rows = Array.isArray(kpis) ? kpis : [];
  const cols =
    columns ||
    [
      "SKU",
      "Artikel",
      "Variante",
      "Leiste",
      "Größe",
      "Bestand",
      "Verkäufe total",
      "Sell-Through",
      "Days of Cover",
      "OOS",
      "Low Stock",
      "Slow Mover",
    ];
  const [expanded, setExpanded] = useState(new Set());

  return (
    <section aria-label="KPI Table" style={{ marginTop: "16px" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
        <thead>
          <tr>
            {cols.map((header) => (
              <th key={header} style={cellStyle(true)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
            {rows.map((kpi, idx) => {
              const key = kpi?.sku || idx;
              const isOpen = expanded.has(key);
              return (
                <Fragment key={key}>
                  <tr
                    style={rowStyle(idx)}
                    onClick={
                      expandable
                        ? () => {
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return next;
                            });
                          }
                        : undefined
                    }
                  >
                    {cols.map((header, colIdx) => (
                      <td
                        key={`${key}-${header}`}
                        style={colIdx === 0 ? { ...cellStyle(), ...firstColStyle } : cellStyle()}
                      >
                        {renderCell(header, kpi)}
                      </td>
                    ))}
                  </tr>
                  {expandable && isOpen && (
                    <tr style={rowStyle(idx)}>
                      <td style={{ ...cellStyle(), ...firstColStyle }} colSpan={cols.length}>
                        {renderDetails ? renderDetails(kpi) : null}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

const firstColStyle = {
  position: "sticky",
  left: 0,
  backgroundColor: "#fff",
  zIndex: 1,
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

function renderCell(header, kpi) {
  switch (header) {
    case "SKU":
      return kpi?.sku || "-";
    case "Artikel":
      return kpi?.artikel || "-";
    case "Variante":
      return kpi?.variante || "-";
    case "Leiste":
      return kpi?.leiste || "-";
    case "Größe":
    case "Groesse":
      return kpi?.groesse || "-";
    case "Bestand":
      return formatNumber(kpi?.bestand);
    case "Verkäufe total":
      return formatNumber(kpi?.verkaufteMengeTotal);
    case "Sell-Through":
      return formatSellThrough(kpi?.sellThrough);
    case "Days of Cover":
      return formatDaysOfCover(kpi?.daysOfCover);
    case "OOS":
      return formatBoolean(kpi?.isOOS);
    case "Low Stock":
      return formatBoolean(kpi?.isLowStock);
    case "Slow Mover":
      return formatBoolean(kpi?.isSlowMover);
    default:
      return "-";
  }
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

function formatBoolean(value) {
  return value ? "✔" : "✖";
}

export default KpiTable;
