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

// Normalisiert einen String fuer Schluesselwerte (Uppercase, beschnitten).
export function normalizeKeyPart(value) {
  const cleaned = normalizeText(value);
  return cleaned ? cleaned.toUpperCase() : "";
}

export function normalizeNumber(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const num = Number.parseFloat(text.replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

// Deutsche Preisangaben wie "235,00 €" nach Number parsen.
export function parseGermanPrice(value) {
  const text = normalizeText(value).replace(/[€\s]/g, "");
  const num = Number.parseFloat(text.replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

// String-Bereinigung ohne Uppercase-Konvertierung.
export function cleanString(value) {
  return normalizeText(value);
}

// Groesse aus Inventory (typisch numerisch) in String-Form bringen.
export function normalizeGroesseInventory(raw) {
  if (raw === null || raw === undefined) return "";
  const text = normalizeText(String(raw));
  const num = Number(text.replace(",", "."));
  if (!Number.isNaN(num)) return num.toString();
  return text;
}

// Groesse aus Sales (kann Doppelgroessen enthalten) normalisieren; ungeeignete Einheiten werden verworfen.
export function normalizeGroesseSales(raw) {
  const s = normalizeText(raw).toUpperCase();
  if (!s) return "";
  if (s === "STK." || s === "STK" || s === "PAAR") return "";

  const numeric = Number(s.replace(",", "."));
  if (!Number.isNaN(numeric)) return numeric.toString();

  const match = s.match(/^(\d+)[\/\-](\d+)$/);
  if (match) return `${match[1]}-${match[2]}`;

  return s;
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

// Erweiterter SKU-Builder inkl. Qualitaet und Lager (Uppercase, 6er-Schluessel).
export function buildSkuKey(parts) {
  const cleaned = [
    normalizeKeyPart(parts.artikel),
    normalizeKeyPart(parts.variante),
    normalizeKeyPart(parts.leiste),
    normalizeKeyPart(parts.groesse),
    normalizeKeyPart(parts.qualitaet),
    normalizeKeyPart(parts.lager),
  ];
  return cleaned.join("|");
}
