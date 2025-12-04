function KpiSummaryCards({ kpis }) {
  const list = Array.isArray(kpis) ? kpis : [];

  const totalSkus = list.length;
  const oosCount = list.filter((item) => item?.isOOS).length;
  const lowStockCount = list.filter((item) => item?.isLowStock).length;
  const slowMoverCount = list.filter((item) => item?.isSlowMover).length;
  const urgentCount = list.filter(
    (item) => item?.daysOfCover !== null && item?.daysOfCover !== undefined && item.daysOfCover < 5,
  ).length;

  const sellThroughValues = list
    .map((item) => Number(item?.sellThrough))
    .filter((value) => Number.isFinite(value) && value > 0);

  const avgSellThrough = sellThroughValues.length
    ? sellThroughValues.reduce((sum, value) => sum + value, 0) /
      sellThroughValues.length
    : 0;

  const metrics = [
    { label: "Low Stock", value: lowStockCount, tone: "amber", emphasis: "primary" },
    { label: "Slow Movers", value: slowMoverCount, tone: "blue", emphasis: "primary" },
    { label: "Urgent (<5 DoC)", value: urgentCount, tone: "red" },
    { label: "Total SKUs", value: totalSkus },
    { label: "Out of Stock", value: oosCount, tone: "red" },
    { label: "Avg Sell-Through", value: avgSellThrough },
  ];

  return (
    <section aria-label="KPI Summary" style={{ marginTop: "16px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {metrics.map(({ label, value, tone, emphasis }) => (
          <div
            key={label}
            style={{
              padding: "20px",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              backgroundColor: "#fff",
              transform: emphasis === "primary" ? "scale(1.01)" : "scale(1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={badgeStyle(tone)} />
              <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: 600 }}>{label}</div>
            </div>
            <div
              style={{
                fontSize: emphasis === "primary" ? "28px" : "24px",
                fontWeight: 800,
                color: "#111827",
              }}
            >
              {formatValue(value)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function badgeStyle(tone) {
  const colors = {
    red: { bg: "#fee2e2", dot: "#b91c1c" },
    amber: { bg: "#fef3c7", dot: "#b45309" },
    blue: { bg: "#e0f2fe", dot: "#0ea5e9" },
    default: { bg: "#e5e7eb", dot: "#6b7280" },
  };
  const picked = colors[tone] || colors.default;
  return {
    display: "inline-block",
    width: "22px",
    height: "22px",
    borderRadius: "999px",
    background: `radial-gradient(circle at center, ${picked.dot} 40%, ${picked.bg} 45%)`,
    position: "relative",
  };
}

function formatValue(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : value.toFixed(2);
  }
  if (value === null || value === undefined) {
    return "-";
  }
  return String(value);
}

export default KpiSummaryCards;
