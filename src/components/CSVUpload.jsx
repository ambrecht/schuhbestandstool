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
}) {
  const inventoryInputRef = useRef(null);
  const salesInputRef = useRef(null);

  const [inventoryFileInfo, setInventoryFileInfo] = useState(null);
  const [salesFileInfo, setSalesFileInfo] = useState(null);

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
    <div>
      <UploadCard
        title="Inventar CSV auswaehlen"
        inputRef={inventoryInputRef}
        onChange={handleInventoryChange}
        onReset={resetInventory}
        loading={loadingInventory}
        error={errorInventory}
        fileInfo={inventoryFileInfo}
        rowsCount={Array.isArray(inventoryData) ? inventoryData.length : 0}
      />

      <UploadCard
        title="Verkaeufe CSV auswaehlen"
        inputRef={salesInputRef}
        onChange={handleSalesChange}
        onReset={resetSales}
        loading={loadingSales}
        error={errorSales}
        fileInfo={salesFileInfo}
        rowsCount={Array.isArray(salesData) ? salesData.length : 0}
      />
    </div>
  );
}

function UploadCard({
  title,
  inputRef,
  onChange,
  onReset,
  loading,
  error,
  fileInfo,
  rowsCount,
}) {
  return (
    <div
      style={{
        border: "1px solid #444",
        padding: "12px",
        marginBottom: "12px",
        borderRadius: "6px",
      }}
    >
      <strong>{title}</strong>
      <div style={{ marginTop: "8px", marginBottom: "8px" }}>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onChange}
          disabled={loading}
        />
        <button
          type="button"
          onClick={onReset}
          disabled={loading}
          style={{ marginLeft: "8px" }}
        >
          Entfernen
        </button>
      </div>

      <StatusRow label="Status" value={loading ? "Laedt..." : "Bereit"} />
      <StatusRow label="Datei" value={fileInfo?.name || "-"} />
      <StatusRow
        label="Groesse (KB)"
        value={fileInfo ? fileInfo.sizeKb.toFixed(1) : "-"}
      />
      <StatusRow label="Zeilen eingelesen" value={rowsCount} />
      <StatusRow label="Fehler" value={error || "-"} isError={Boolean(error)} />
    </div>
  );
}

function StatusRow({ label, value, isError = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
      <span>{label}:</span>
      <span style={{ color: isError ? "#b00020" : "inherit" }}>{value}</span>
    </div>
  );
}

function toFileInfo(file) {
  return { name: file.name, sizeKb: file.size / 1024 };
}

export default CSVUpload;
