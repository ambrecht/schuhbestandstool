import { useRef, useState } from "react";

// Pure UI for selecting and resetting inventory/sales CSV files.
function CSVUpload({
  onInventoryLoad,
  onSalesLoad,
  inventoryData,
  salesData,
  loadingInventory,
  loadingSales,
  errorInventory,
  errorSales,
  inventorySource = "empty",
  salesSource = "empty",
  readyForAnalysis = false,
  isDevMode = false,
}) {
  const inventoryInputRef = useRef(null);
  const salesInputRef = useRef(null);

  const [inventoryFileInfo, setInventoryFileInfo] = useState(null);
  const [salesFileInfo, setSalesFileInfo] = useState(null);
  const inventoryRows = Array.isArray(inventoryData) ? inventoryData.length : 0;
  const salesRows = Array.isArray(salesData) ? salesData.length : 0;

  const handleInventoryChange = (event) => {
    const file = event.target.files?.[0] || null;
    setInventoryFileInfo(file ? toFileInfo(file) : null);
    if (onInventoryLoad) {
      onInventoryLoad(file);
    }
  };

  const handleSalesChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSalesFileInfo(file ? toFileInfo(file) : null);
    if (onSalesLoad) {
      onSalesLoad(file);
    }
  };

  const resetInventory = () => {
    if (inventoryInputRef.current) {
      inventoryInputRef.current.value = "";
    }
    setInventoryFileInfo(null);
    if (onInventoryLoad) {
      onInventoryLoad(null);
    }
  };

  const resetSales = () => {
    if (salesInputRef.current) {
      salesInputRef.current.value = "";
    }
    setSalesFileInfo(null);
    if (onSalesLoad) {
      onSalesLoad(null);
    }
  };

  return (
    <section style={sectionStyle}>
      <div style={headerRow}>
        <div>
          <div style={eyebrow}>Datenimport</div>
          <h2 style={titleStyle}>Bestand und Verkaeufe laden</h2>
          <p style={descriptionStyle}>
            Die Analyse laeuft komplett im Browser. Fuer den Produktivbetrieb werden eine Bestands-CSV und eine
            Verkaeufe-CSV benoetigt.
          </p>
        </div>
        <div style={summaryCard(readyForAnalysis)}>
          <div style={summaryLabelStyle}>Analyse-Status</div>
          <div style={summaryValueStyle}>{readyForAnalysis ? "Bereit" : "Wartet auf CSV-Dateien"}</div>
          <div style={summaryMetaStyle}>
            {inventoryRows > 0 ? "Bestand geladen" : "Bestand fehlt"} · {salesRows > 0 ? "Verkaeufe geladen" : "Verkaeufe fehlen"}
          </div>
        </div>
      </div>

      <div style={infoBarStyle}>
        {isDevMode
          ? "DEV: Beispieldaten werden automatisch geladen. Ein manueller Upload ueberschreibt die Beispieldaten sofort."
          : "PROD: Der Nutzer laedt beide CSV-Dateien direkt im Browser hoch. Es wird kein Server-Upload benoetigt."}
      </div>

      <div style={cardGridStyle}>
        <UploadCard
          title="Bestands-CSV"
          description="Aktueller Lagerbestand pro Modell, Variante, Leiste und Groesse."
          inputRef={inventoryInputRef}
          onChange={handleInventoryChange}
          onReset={resetInventory}
          loading={loadingInventory}
          error={errorInventory}
          fileInfo={inventoryFileInfo}
          rowsCount={inventoryRows}
          source={inventorySource}
        />

        <UploadCard
          title="Verkaeufe-CSV"
          description="Historische Abverkaeufe fuer die Nachfrage-, Topseller- und Reorder-Analyse."
          inputRef={salesInputRef}
          onChange={handleSalesChange}
          onReset={resetSales}
          loading={loadingSales}
          error={errorSales}
          fileInfo={salesFileInfo}
          rowsCount={salesRows}
          source={salesSource}
        />
      </div>
    </section>
  );
}

function UploadCard({
  title,
  description,
  inputRef,
  onChange,
  onReset,
  loading,
  error,
  fileInfo,
  rowsCount,
  source,
}) {
  const sourceMeta = describeSource(source);
  const statusTone = error ? "error" : rowsCount > 0 ? "success" : "pending";

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        padding: "16px",
        borderRadius: "12px",
        backgroundColor: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <strong style={{ display: "block", fontSize: "16px" }}>{title}</strong>
          <div style={{ marginTop: "4px", color: "#6b7280", fontSize: "13px" }}>{description}</div>
        </div>
        <StatusBadge tone={statusTone} label={error ? "Fehler" : rowsCount > 0 ? "Geladen" : "Noch offen"} />
      </div>

      <div style={{ marginTop: "14px", marginBottom: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onChange}
          disabled={loading}
          style={fileInputStyle}
        />
        <button
          type="button"
          onClick={onReset}
          disabled={loading}
          style={secondaryButtonStyle}
        >
          Entfernen
        </button>
      </div>

      <StatusRow label="Status" value={loading ? "Laedt..." : "Bereit"} />
      <StatusRow label="Quelle" value={sourceMeta.label} />
      <StatusRow label="Hinweis" value={sourceMeta.description} />
      <StatusRow label="Datei" value={fileInfo?.name || (source === "sample" ? "Beispieldaten" : "-")} />
      <StatusRow label="Groesse (KB)" value={fileInfo ? fileInfo.sizeKb.toFixed(1) : "-"} />
      <StatusRow label="Zeilen eingelesen" value={rowsCount} />
      <StatusRow label="Fehler" value={error || "-"} isError={Boolean(error)} />
    </div>
  );
}

function StatusRow({ label, value, isError = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "6px 0", borderTop: "1px solid #f3f4f6" }}>
      <span style={{ color: "#6b7280", fontWeight: 600 }}>{label}:</span>
      <span style={{ color: isError ? "#b00020" : "inherit", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function StatusBadge({ tone, label }) {
  const tones = {
    success: { bg: "#dcfce7", text: "#166534" },
    pending: { bg: "#fef3c7", text: "#92400e" },
    error: { bg: "#fee2e2", text: "#b91c1c" },
  };
  const activeTone = tones[tone] || tones.pending;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 10px",
        borderRadius: "999px",
        backgroundColor: activeTone.bg,
        color: activeTone.text,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function describeSource(source) {
  if (source === "upload") {
    return {
      label: "Manueller Upload",
      description: "Datei wurde vom Nutzer ausgewaehlt.",
    };
  }

  if (source === "sample") {
    return {
      label: "Beispieldaten (DEV)",
      description: "Automatisch geladene Entwicklungsdaten.",
    };
  }

  return {
    label: "Keine Datei",
    description: "Noch keine CSV geladen.",
  };
}

function toFileInfo(file) {
  return { name: file.name, sizeKb: file.size / 1024 };
}

const sectionStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const eyebrow = {
  fontSize: "12px",
  textTransform: "uppercase",
  color: "#6b7280",
  letterSpacing: "0.08em",
  fontWeight: 700,
};

const titleStyle = {
  margin: "4px 0 8px",
  fontSize: "28px",
  lineHeight: 1.1,
};

const descriptionStyle = {
  margin: 0,
  color: "#4b5563",
  maxWidth: "720px",
  lineHeight: 1.5,
};

const summaryCard = (ready) => ({
  minWidth: "260px",
  padding: "14px 16px",
  borderRadius: "14px",
  border: `1px solid ${ready ? "#bbf7d0" : "#fde68a"}`,
  backgroundColor: ready ? "#f0fdf4" : "#fffbeb",
});

const summaryLabelStyle = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#6b7280",
  fontWeight: 700,
};

const summaryValueStyle = {
  marginTop: "6px",
  fontSize: "22px",
  fontWeight: 800,
  color: "#111827",
};

const summaryMetaStyle = {
  marginTop: "4px",
  color: "#4b5563",
  fontSize: "13px",
};

const infoBarStyle = {
  marginTop: "16px",
  padding: "12px 14px",
  borderRadius: "12px",
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  fontSize: "14px",
  lineHeight: 1.5,
};

const cardGridStyle = {
  marginTop: "16px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
};

const fileInputStyle = {
  flex: "1 1 220px",
};

const secondaryButtonStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  backgroundColor: "#f9fafb",
  color: "#111827",
  fontWeight: 700,
  cursor: "pointer",
};

export default CSVUpload;
