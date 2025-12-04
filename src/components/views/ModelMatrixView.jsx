import { useEffect, useMemo, useState } from "react";
import { buildModelList } from "../../utils/viewSelectors";
import { logDebug } from "../../utils/debug";
import { mapStatus } from "../../utils/statusMapping";

const STATUS_TONES = {
  MISSING_WITH_DEMAND: { bg: "#fee2e2", text: "#b91c1c", label: "Fehlt bei Nachfrage" },
  MISSING_NO_DEMAND: { bg: "#e5e7eb", text: "#4b5563", label: "Fehlt (keine Nachfrage)" },
  URGENT_LOW_STOCK: { bg: "#fef3c7", text: "#b45309", label: "Sehr knapp" },
  LOW_STOCK: { bg: "#fffbeb", text: "#92400e", label: "Knapp" },
  CRITICAL: { bg: "#fde68a", text: "#92400e", label: "Kritischer Restbestand" },
  REORDER: { bg: "#fecdd3", text: "#b91c1c", label: "Bestellen" },
  OOS_INACTIVE: { bg: "#e5e7eb", text: "#6b7280", label: "Inaktiv" },
  OK: { bg: "#dcfce7", text: "#166534", label: "OK" },
};

function ModelMatrixView({ insights, topSellerSkuSet, focusFilters, onClearFocus, periodLabel }) {
  const [query, setQuery] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [onlyRelevant, setOnlyRelevant] = useState(true);
  const modelList = useMemo(() => buildModelList(insights), [insights]);
  const filteredModels = useMemo(() => {
    return modelList.filter((model) => {
      if (onlyIssues && !model.hasProblems) return false;
      if (focusFilters?.variant) {
        const containsVariant = (insights?.grouped?.[model.model]?.variants || {})[focusFilters.variant];
        if (!containsVariant) return false;
      }
      if (query) {
        return model.model.toLowerCase().includes(query.toLowerCase());
      }
      return true;
    });
  }, [modelList, query, onlyIssues, focusFilters, insights]);

  const [selectedModel, setSelectedModel] = useState("");
  const hasSelection = useMemo(
    () => filteredModels.some((m) => m.model === selectedModel),
    [filteredModels, selectedModel],
  );

  useEffect(() => {
    // Initialize selection on first render or when filtered list changes and current selection is invalid.
    if (selectedModel && hasSelection) return;
    if (focusFilters?.model && filteredModels.some((m) => m.model === focusFilters.model)) {
      setSelectedModel(focusFilters.model);
      return;
    }
    // Prefer first model with problems if available, else first in list.
    const firstProblem = filteredModels.find((m) => m.hasProblems)?.model;
    const fallback = filteredModels[0]?.model;
    const next = firstProblem || fallback || "";
    setSelectedModel(next);
  }, [filteredModels, hasSelection, focusFilters?.model, selectedModel]);

  const model = selectedModel ? insights?.grouped?.[selectedModel] : null;
  const matrices = useMemo(
    () => buildMatrices(model, topSellerSkuSet, { onlyRelevant }),
    [model, topSellerSkuSet, onlyRelevant],
  );
  const activeHasFocus = focusFilters?.variant || focusFilters?.model;

  const [activeCell, setActiveCell] = useState(null);
  useEffect(() => setActiveCell(null), [selectedModel]);

  useEffect(() => {
    logDebug("[DEBUG][ModelMatrixView]", {
      modelsTotal: modelList.length,
      filteredModels: filteredModels.length,
      selectedModel,
      matrices: matrices.length,
      hasProblemsFilter: onlyIssues,
      focusFilters,
      periodLabel,
    });
  }, [modelList.length, filteredModels.length, selectedModel, matrices.length, onlyIssues, focusFilters, periodLabel]);

  useEffect(() => {
    if (!model || !logDebug) return;
    // Collect SKUs from insights matrix
    const matrixSkus = new Set();
    const matrixEntries = [];
    for (const variant of Object.values(model.variants || {})) {
      for (const leiste of Object.values(variant.leiste || {})) {
        for (const kpi of Object.values(leiste.sizes || {})) {
          const skuKey = `${kpi.artikel}|${kpi.variante}|${kpi.leiste}|${kpi.groesse}`;
          matrixSkus.add(skuKey);
          matrixEntries.push({
            sku: skuKey,
            salesQty: kpi.verkaufteMengeTotal ?? kpi.salesQty ?? 0,
            stockQty: kpi.bestand ?? kpi.stockQty ?? 0,
            relevant: kpi.isRelevantForMatrix,
          });
        }
      }
    }

    // Collect SKUs from Top-100 rows (available via insights.topSellers or passed set)
    const topSkus = new Set();
    const topEntries = [];
    const topList = insights?.topSellers?.[selectedModel] || [];
    topList.forEach((item) => {
      const skuKey = `${item.artikel || item.sku || selectedModel}|${item.variante}|${item.leiste}|${item.groesse}`;
      topSkus.add(skuKey);
      topEntries.push({ sku: skuKey, salesQty: item.verkaufteMengeTotal ?? 0, stockQty: item.bestand ?? 0 });
    });

    const inMatrixNotTop = matrixEntries.filter((e) => !topSkus.has(e.sku) && (e.salesQty > 0 || e.stockQty > 0 || e.relevant));
    const inTopNotMatrix = topEntries.filter((e) => !matrixSkus.has(e.sku));

    logDebug("[DEBUG][ModelMatrixView SKU Diff]", {
      model: selectedModel,
      matrixCount: matrixEntries.length,
      topCount: topEntries.length,
      matrixNotTop: inMatrixNotTop,
      topNotMatrix: inTopNotMatrix,
    });
  }, [model, selectedModel, insights?.topSellers, logDebug]);

  return (
    <section style={sectionStyle}>
      <div style={headerRow}>
        <div>
          <div style={eyebrow}>Modelluebersicht</div>
          <h2 style={titleStyle}>Modell-Matrix</h2>
          <div style={subtleText}>
            Zeitraum: {periodLabel || "gewaehlter Zeitraum"} · Matrix nach Groessen (Zeilen) und Varianten/Farben (Spalten).
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
          <label style={checkboxLabel}>
            <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
            Nur Modelle mit Problemen
          </label>
          <label style={checkboxLabel}>
            <input type="checkbox" checked={onlyRelevant} onChange={(e) => setOnlyRelevant(e.target.checked)} />
            Nur aktuelle Varianten anzeigen
          </label>
          {activeHasFocus ? (
            <button type="button" onClick={onClearFocus} style={linkButtonStyle}>
              Farbfilter loeschen
            </button>
          ) : null}
        </div>
      </div>

      <div style={filterBar}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <label style={fieldLabel}>
            Modell suchen
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="z. B. Eisbear"
              style={searchInputStyle}
            />
          </label>
          <label style={checkboxLabel}>
            <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
            Nur Modelle mit Problemen
          </label>
          {focusFilters?.variant ? <FilterChip label={`Farbe: ${focusFilters.variant}`} /> : null}
          {activeHasFocus ? (
            <button type="button" onClick={onClearFocus} style={linkButtonStyle}>
              Filter zuruecksetzen
            </button>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {filteredModels.slice(0, 12).map((modelEntry) => (
            <button
              key={modelEntry.model}
              type="button"
              onClick={() => setSelectedModel(modelEntry.model)}
              style={modelChipStyle(selectedModel === modelEntry.model)}
            >
              <div style={{ fontWeight: 800 }}>{modelEntry.model}</div>
              <div style={{ fontSize: "12px", color: "#4b5563" }}>
                {formatNumber(modelEntry.totalSales)} Verkaeufe · {modelEntry.gapSummary}
              </div>
            </button>
          ))}
        </div>
      </div>

      {!model ? (
        <EmptyState
          title="Keine Modelle im Zeitraum"
          message="Fuer den gewaehlten Zeitraum liegen keine Verkaeufe vor. Bitte Zeitraum oder Filter anpassen."
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
          <div>
            <div style={{ marginBottom: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <LegendItem tone={STATUS_TONES.OK} />
              <LegendItem tone={STATUS_TONES.LOW_STOCK} />
              <LegendItem tone={STATUS_TONES.URGENT_LOW_STOCK} />
              <LegendItem tone={STATUS_TONES.MISSING_WITH_DEMAND} />
              <LegendItem tone={STATUS_TONES.MISSING_NO_DEMAND} />
            </div>
            {matrices.length === 0 && (
              <EmptyState
                title="Keine Matrix-Daten"
                message="Fuer dieses Modell liegen im gewaehlten Zeitraum keine passenden Groessen/Varianten vor."
              />
            )}
            {matrices.map((matrix) => (
              <div key={matrix.leiste} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ fontWeight: 800, fontSize: "15px" }}>Leiste {matrix.leiste}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Zeilen: Groessen · Spalten: Varianten/Farben
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={cellStyle(true)}>Groesse</th>
                        {matrix.variants.map((variant) => (
                          <th key={variant} style={cellStyle(true)}>
                            {variant}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.sizes.map((size, idx) => (
                        <tr key={`${matrix.leiste}-${size}`} style={rowStyle(idx)}>
                          <td style={cellStyle()}>{size}</td>
                          {matrix.variants.map((variant) => {
                            const cell = matrix.cells[`${variant}-${size}`];
                            return (
                              <td key={`${variant}-${size}`} style={cellStyle()}>
                                {cell ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveCell(cell)}
                                    style={matrixCellStyle(cell)}
                                    title="Details anzeigen"
                                  >
                                    <span>
                                      {cell.statusKey === "REORDER" ? "Bestellen" : formatNumber(cell.stockQty)}
                                    </span>
                                    <span style={{ fontSize: "12px" }}>
                                      {cell.isTopSeller ? "★" : ""}
                                      {cell.isCritical ? "🔥" : ""}
                                    </span>
                                    {!onlyRelevant && cell.isHistoricalSku ? (
                                      <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>
                                        historisch
                                      </span>
                                    ) : null}
                                  </button>
                                ) : (
                                  <span style={{ color: "#9ca3af" }}>-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <aside style={panelStyle}>
            <div style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px" }}>
              Details
            </div>
            {activeCell ? (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: "8px" }}>
                  {activeCell.model} · {activeCell.variant} · {activeCell.leiste} · {activeCell.size}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px" }}>
                  <DetailItem label="Verkaeufe (Zeitraum)" value={formatNumber(activeCell.salesQty)} />
                  <DetailItem label="Ø Verkaeufe/Monat" value={formatNumber(Math.round(activeCell.avgMonthlySales))} />
                  <DetailItem label="Aktueller Bestand" value={formatNumber(activeCell.stockQty)} />
                  <DetailItem label="Mindestbestand (Empfehlung)" value={formatNumber(Math.round(activeCell.reorderPoint))} />
                  <DetailItem
                    label="Status"
                    value={mapStatus(activeCell.statusKey || activeCell.status)?.label || "-"}
                  />
                </div>
                <div style={{ marginTop: "10px", fontSize: "13px", color: "#4b5563" }}>
                  {buildStatusText(activeCell)}
                </div>
              </div>
            ) : (
              <EmptyState
                title="Zelle waehlen"
                message="Klicke auf eine Zelle, um Detailwerte und Mindestbestand zu sehen."
              />
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

function buildMatrices(model, topSellerSkuSet, { onlyRelevant = false } = {}) {
  if (!model) return [];

  const leisteMap = new Map();

  for (const [variantName, variant] of Object.entries(model.variants || {})) {
    for (const [leisteName, leiste] of Object.entries(variant.leiste || {})) {
      const entry =
        leisteMap.get(leisteName) ||
        { leiste: leisteName, variants: new Set(), sizes: new Set(), cells: new Map() };

      for (const [size, raw] of Object.entries(leiste.sizes || {})) {
        if (!raw) continue;
        const skip = onlyRelevant && raw.isHistoricalSku;
        if (skip) continue;

        entry.variants.add(variantName);
        entry.sizes.add(size);

        const statusKey = raw.statusKey || raw.status || "OK";
        const status = statusKey;
        const reorderPoint = raw.reorderPoint ?? raw.workingReserve ?? 0;
        entry.cells.set(`${variantName}-${size}`, {
          model: model.modelName,
          variant: variantName,
          size,
          leiste: leisteName,
          stockQty: raw.bestand ?? raw.stockQty ?? 0,
          salesQty: raw.verkaufteMengeTotal ?? raw.salesQty ?? 0,
          avgMonthlySales: (raw.avgDailySales || 0) * 30,
          reorderPoint,
          status,
          daysOfCover: raw.daysOfCover,
          isTopSeller: topSellerSkuSet?.has(raw.sku),
          isCritical: (raw.bestand ?? 0) <= 2 || (reorderPoint > 0 && (raw.bestand ?? 0) < reorderPoint / 2),
          isHistoricalSku: raw.isHistoricalSku,
          isRelevantForMatrix: raw.isRelevantForMatrix,
          statusKey,
        });
      }

      leisteMap.set(leisteName, entry);
    }
  }

  const matrices = [];
  for (const entry of leisteMap.values()) {
    const variants = sortVariantsByPriority(entry, topSellerSkuSet);
    const sizes = Array.from(entry.sizes).sort((a, b) => String(a).localeCompare(String(b), "de"));
    if (!variants.length || !sizes.length) continue;
    const cells = Object.fromEntries(entry.cells);
    matrices.push({ leiste: entry.leiste, variants, sizes, cells });
  }

  return matrices;
}

function sortVariantsByPriority(entry, topSellerSkuSet) {
  const scores = new Map();
  for (const key of entry.cells.keys()) {
    const [variantName] = key.split("-");
    const cell = entry.cells.get(key);
    const sales = Number(cell?.salesQty) || 0;
    const urgent = cell?.needsReorder || cell?.isUrgent || cell?.isCritical;
    const isTop = topSellerSkuSet?.has(cell?.sku);
    const prev = scores.get(variantName) || { sales: 0, urgent: 0, top: 0 };
    scores.set(variantName, {
      sales: prev.sales + sales,
      urgent: prev.urgent + (urgent ? 1 : 0),
      top: prev.top + (isTop ? 1 : 0),
    });
  }

  return Array.from(entry.variants).sort((a, b) => {
    const sa = scores.get(a) || { sales: 0, urgent: 0, top: 0 };
    const sb = scores.get(b) || { sales: 0, urgent: 0, top: 0 };
    return (
      (sb.sales || 0) - (sa.sales || 0) ||
      (sb.urgent || 0) - (sa.urgent || 0) ||
      (sb.top || 0) - (sa.top || 0) ||
      String(a).localeCompare(String(b), "de")
    );
  });
}

function matrixCellStyle(cell) {
  const tone =
    STATUS_TONES[cell.statusKey] ||
    (cell.stockQty === 0 && cell.salesQty > 0 && STATUS_TONES.MISSING_WITH_DEMAND) ||
    STATUS_TONES[cell.status] ||
    STATUS_TONES.OK;
  const historical = cell.isHistoricalSku;
  return {
    width: "100%",
    padding: "10px 8px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    backgroundColor: tone.bg,
    color: tone.text,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    cursor: "pointer",
    minWidth: "120px",
    opacity: historical ? 0.6 : 1,
    borderStyle: historical ? "dashed" : "solid",
  };
}

function DetailItem({ label, value }) {
  return (
    <div style={{ padding: "10px", border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "#fff" }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: "14px", color: "#111827" }}>{value}</div>
    </div>
  );
}

function LegendItem({ tone }) {
  if (!tone) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#374151" }}>
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

function EmptyState({ title, message }) {
  return (
    <div style={{ padding: "16px", borderRadius: "10px", border: "1px dashed #d1d5db", backgroundColor: "#f9fafb" }}>
      <div style={{ fontWeight: 700, marginBottom: "4px" }}>{title}</div>
      <div style={{ color: "#6b7280", fontSize: "13px" }}>{message}</div>
    </div>
  );
}

function buildStatusText(cell) {
  if (cell.statusKey === "REORDER") {
    const sales = formatNumber(cell.salesQty);
    return `❗ Bestellen: ${sales} Verkaeufe im Zeitraum, 0 Paare auf Lager.`;
  }
  if (cell.stockQty === 0 && cell.salesQty > 0) return "Nachbestellen empfohlen: Bestand 0 trotz Nachfrage im Zeitraum.";
  if (cell.stockQty === 0) return "Nicht kritisch: keine Nachfrage im Zeitraum und kein Bestand.";
  if (cell.stockQty < cell.reorderPoint) return "Bestand unter Mindestbestand - zeitnah auffuellen.";
  return "Bestand ist aktuell ausreichend.";
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

const titleStyle = { margin: "0 0 4px 0" };
const eyebrow = { fontSize: "12px", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.08em", fontWeight: 700 };
const subtleText = { fontSize: "13px", color: "#6b7280" };
const checkboxLabel = { display: "flex", gap: "6px", alignItems: "center", fontSize: "13px", fontWeight: 600 };
const filterBar = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "12px",
  borderRadius: "10px",
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  marginTop: "12px",
};

const searchInputStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  minWidth: "240px",
};

const fieldLabel = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  fontSize: "12px",
  color: "#4b5563",
  fontWeight: 700,
};

const modelChipStyle = (active) => ({
  padding: "10px 12px",
  borderRadius: "10px",
  border: active ? "2px solid #111827" : "1px solid #d1d5db",
  backgroundColor: active ? "#111827" : "#fff",
  color: active ? "#fff" : "#111827",
  minWidth: "200px",
  textAlign: "left",
});

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

const rowStyle = (idx) => ({
  backgroundColor: idx % 2 === 0 ? "#fcfcfc" : "#fff",
});

const linkButtonStyle = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#111827",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const panelStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "12px",
  backgroundColor: "#f9fafb",
  minHeight: "280px",
};

export default ModelMatrixView;
