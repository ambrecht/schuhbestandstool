import { useMemo } from "react";
import { buildRelativePeriod } from "../utils/periods";

function PeriodSelector({ period, onChange, salesRange }) {
  const referenceDate = salesRange?.max || new Date();

  const datasetPreset = useMemo(() => {
    if (salesRange?.min && salesRange?.max) {
      return {
        key: "dataset",
        label: `CSV-Zeitraum (${toInputDate(salesRange.min)} bis ${toInputDate(salesRange.max)})`,
        start: salesRange.min,
        end: salesRange.max,
      };
    }
    return null;
  }, [salesRange]);

  const presets = useMemo(() => {
    const base = [
      datasetPreset,
      buildRelativePeriod("last30", referenceDate),
      buildRelativePeriod("last90", referenceDate),
      buildRelativePeriod("summer", referenceDate),
      buildRelativePeriod("winter", referenceDate),
    ];
    return base.filter(Boolean);
  }, [referenceDate, datasetPreset]);

  const handlePreset = (preset) => {
    onChange?.({
      ...preset,
      label: preset.label,
    });
  };

  const onCustomChange = (field, value) => {
    const next = {
      key: "custom",
      label: "Benutzerdefiniert",
      start: field === "start" ? parseDateValue(value) : period?.start,
      end: field === "end" ? parseDateValue(value) : period?.end,
    };
    onChange?.(next);
  };

  const startValue = toInputDate(period?.start);
  const endValue = toInputDate(period?.end);

  return (
    <div style={wrapperStyle}>
      <div style={{ fontSize: "12px", color: "#4b5563", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
        Zeitraum / Saison
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "8px 0" }}>
        {presets.map((preset) => {
          const active = period?.key === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => handlePreset(preset)}
              style={chipStyle(active)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <label style={fieldLabel}>
          Von
          <input type="date" value={startValue} onChange={(e) => onCustomChange("start", e.target.value)} style={dateInputStyle} />
        </label>
        <label style={fieldLabel}>
          Bis
          <input type="date" value={endValue} onChange={(e) => onCustomChange("end", e.target.value)} style={dateInputStyle} />
        </label>
        <span style={{ fontSize: "12px", color: "#6b7280" }}>
          {salesRange?.min && salesRange?.max
            ? `Daten verfuegbar: ${toInputDate(salesRange.min)} - ${toInputDate(salesRange.max)}`
            : "Keine Verkaufsdaten geladen"}
        </span>
      </div>
    </div>
  );
}

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toInputDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
  return value.toISOString().slice(0, 10);
}

function chipStyle(active) {
  return {
    padding: "8px 12px",
    borderRadius: "999px",
    border: active ? "2px solid #111827" : "1px solid #d1d5db",
    backgroundColor: active ? "#111827" : "#fff",
    color: active ? "#fff" : "#111827",
    fontWeight: 700,
    cursor: "pointer",
  };
}

const wrapperStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "12px 14px",
  backgroundColor: "#f9fafb",
};

const fieldLabel = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  fontSize: "12px",
  color: "#4b5563",
  fontWeight: 600,
};

const dateInputStyle = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#fff",
  minWidth: "160px",
};

export default PeriodSelector;
