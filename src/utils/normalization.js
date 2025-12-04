export function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200F]/g, "")
    .replace(/\u00A0/g, " ")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNumber(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const num = Number.parseFloat(text.replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

export function normalizeSize(row) {
  const candidates = [
    "Groesse",
    "Größe",
    "groesse",
    "größe",
    "GROESSE",
    "groesse_",
    "_groesse",
    "groesse\r",
    "groesse\n",
  ];

  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const v = normalizeText(row[key]);
      if (v) return v;
    }
  }
  return "";
}

export function buildSku(parts) {
  const cleaned = [parts.artikel, parts.variante, parts.leiste, parts.groesse].map((p) =>
    normalizeText(p),
  );
  return cleaned.join("|");
}
