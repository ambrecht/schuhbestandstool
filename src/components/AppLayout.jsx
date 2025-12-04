import PeriodSelector from "./PeriodSelector";
import SectionNav from "./SectionNav";

function AppLayout({ activeSection, onSectionChange, children, period, onPeriodChange, salesRange }) {
  return (
    <div style={{ backgroundColor: "#f7f7f7", minHeight: "100vh" }}>
      <header
        style={{
          backgroundColor: "#fff",
          borderBottom: "1px solid #e6e6e6",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={containerStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              padding: "16px 0",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #1f2937, #111827)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
              >
                BI
              </div>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 800 }}>Bestandstool</div>
                <div style={{ fontSize: "13px", color: "#666" }}>B2B Schuhhandel - Lager & Reorder</div>
              </div>
            </div>
            <div style={{ minWidth: "420px", flex: 1 }}>
              <PeriodSelector period={period} onChange={onPeriodChange} salesRange={salesRange} />
            </div>
          </div>
          <SectionNav activeSection={activeSection} onChange={onSectionChange} />
        </div>
      </header>

      <main style={{ padding: "32px 0" }}>
        <div style={containerStyle}>{children}</div>
      </main>

      <footer style={{ padding: "12px 0", borderTop: "1px solid #e6e6e6", color: "#888" }}>
        <div style={containerStyle}>Dev Mode: CSVs werden automatisch geladen (nur Entwicklung).</div>
      </footer>
    </div>
  );
}

const containerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "24px",
};

export default AppLayout;
