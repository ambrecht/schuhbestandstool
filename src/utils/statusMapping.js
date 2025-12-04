const STATUS_MAP = {
  REORDER: { label: "Bestellen", icon: "❗" },
  HOT_SELLER: { label: "Hot Seller – nachbestellen", icon: "🔥" },
  LOW: { label: "Bestand gering", icon: "⚠️" },
  OK: { label: "Bestand ok", icon: "✅" },
  OOS_INACTIVE: { label: "Ausverkauft, keine Nachfrage", icon: "–" },
};

export function mapStatus(statusKey) {
  const fallback = STATUS_MAP.OK;
  if (!statusKey) return fallback;
  return STATUS_MAP[statusKey] || fallback;
}
