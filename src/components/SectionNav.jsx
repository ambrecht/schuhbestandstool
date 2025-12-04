function SectionNav({ activeSection, onChange }) {
  const items = [
    { key: "topSeller", label: "Top-Seller" },
    { key: "models", label: "Modelle" },
    { key: "sizes", label: "Groessen & Leisten" },
    { key: "colors", label: "Farben" },
    { key: "orders", label: "Bestellliste" },
  ];

  return (
    <nav style={{ paddingBottom: "16px" }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {items.map((item) => {
          const active = activeSection === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: active ? "1px solid #111827" : "1px solid #d1d5db",
                backgroundColor: active ? "#111827" : "#fff",
                color: active ? "#fff" : "#111827",
                boxShadow: active ? "0 2px 6px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
                cursor: "pointer",
                transition: "transform 120ms ease, box-shadow 120ms ease",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default SectionNav;
