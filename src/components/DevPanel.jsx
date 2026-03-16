import { useState } from "react";

function DevPanel({ title, children }) {
  const [open, setOpen] = useState(false);

  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "12px",
        backgroundColor: "#fff",
        marginBottom: "16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            backgroundColor: "#f9fafb",
            cursor: "pointer",
          }}
        >
          {open ? "Dev Panel schließen" : "Dev Panel öffnen"}
        </button>
      </div>
      {open && <div style={{ marginTop: "10px" }}>{children}</div>}
    </div>
  );
}

export default DevPanel;
