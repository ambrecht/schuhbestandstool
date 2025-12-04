function KpiFilters({ filters, options, onFilterChange }) {
  const safeFilters = filters || {};
  const safeOptions = options || {};

  const activeCount = [
    safeFilters.artikel,
    safeFilters.kategorie,
    safeFilters.groesse,
    safeFilters.leiste,
    safeFilters.oos,
    safeFilters.lowStock,
    safeFilters.slowMover,
    safeFilters.topSeller,
    safeFilters.topSellerOOS,
  ].filter((v) => Boolean(v)).length;

  const chips = buildChips(safeFilters);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backgroundColor: "#f7f7f7",
        paddingBottom: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          padding: "10px",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          backgroundColor: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <FilterField label="Artikel">
          <select
            value={safeFilters.artikel || ""}
            onChange={(e) => onFilterChange({ ...safeFilters, artikel: e.target.value })}
          >
            <option value="">Alle</option>
            {safeOptions.artikel?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Kategorie">
          <select
            value={safeFilters.kategorie || ""}
            onChange={(e) => onFilterChange({ ...safeFilters, kategorie: e.target.value })}
          >
            <option value="">Alle</option>
            {safeOptions.kategorien?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Groesse">
          <select
            value={safeFilters.groesse || ""}
            onChange={(e) => onFilterChange({ ...safeFilters, groesse: e.target.value })}
          >
            <option value="">Alle</option>
            {safeOptions.groessen?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Leiste">
          <select
            value={safeFilters.leiste || ""}
            onChange={(e) => onFilterChange({ ...safeFilters, leiste: e.target.value })}
          >
            <option value="">Alle</option>
            {safeOptions.leisten?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="OOS">
          <input
            type="checkbox"
            checked={Boolean(safeFilters.oos)}
            onChange={(e) => onFilterChange({ ...safeFilters, oos: e.target.checked })}
          />
        </FilterField>

        <FilterField label="Low Stock">
          <input
            type="checkbox"
            checked={Boolean(safeFilters.lowStock)}
            onChange={(e) => onFilterChange({ ...safeFilters, lowStock: e.target.checked })}
          />
        </FilterField>

        <FilterField label="Slow Mover">
          <input
            type="checkbox"
            checked={Boolean(safeFilters.slowMover)}
            onChange={(e) => onFilterChange({ ...safeFilters, slowMover: e.target.checked })}
          />
        </FilterField>

        <FilterField label="Top Seller">
          <input
            type="checkbox"
            checked={Boolean(safeFilters.topSeller)}
            onChange={(e) => onFilterChange({ ...safeFilters, topSeller: e.target.checked })}
          />
        </FilterField>

        <FilterField label="Top Seller OOS">
          <input
            type="checkbox"
            checked={Boolean(safeFilters.topSellerOOS)}
            onChange={(e) => onFilterChange({ ...safeFilters, topSellerOOS: e.target.checked })}
          />
        </FilterField>

        <div
          style={{
            padding: "6px 10px",
            borderRadius: "8px",
            backgroundColor: activeCount ? "#e0f2fe" : "#f3f4f6",
            color: activeCount ? "#0ea5e9" : "#4b5563",
            fontWeight: 700,
          }}
        >
          {activeCount ? `${activeCount} Filter aktiv` : "Keine Filter aktiv"}
        </div>
      </div>

      {chips.length > 0 && (
        <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onFilterChange({ ...safeFilters, [chip.key]: chip.resetValue })}
              style={{
                borderRadius: "12px",
                border: "1px solid #d1d5db",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {chip.label} ✕
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                artikel: "",
                kategorie: "",
                groesse: "",
                leiste: "",
                oos: false,
                lowStock: false,
                slowMover: false,
                topSeller: false,
                topSellerOOS: false,
              })
            }
            style={{
              borderRadius: "12px",
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
              color: "#111827",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "12px", color: "#4b5563", fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

function buildChips(filters) {
  const map = [
    { key: "artikel", label: filters.artikel },
    { key: "kategorie", label: filters.kategorie },
    { key: "groesse", label: filters.groesse },
    { key: "leiste", label: filters.leiste },
    { key: "oos", label: filters.oos ? "OOS" : "" },
    { key: "lowStock", label: filters.lowStock ? "Low Stock" : "" },
    { key: "slowMover", label: filters.slowMover ? "Slow Mover" : "" },
    { key: "topSeller", label: filters.topSeller ? "Top Seller" : "" },
    { key: "topSellerOOS", label: filters.topSellerOOS ? "Top Seller OOS" : "" },
  ];

  return map
    .filter((c) => c.label)
    .map((c) => ({
      key: c.key,
      label: `${c.key}: ${c.label === true ? "aktiv" : c.label}`,
      resetValue: typeof filters[c.key] === "boolean" ? false : "",
    }));
}

export default KpiFilters;
