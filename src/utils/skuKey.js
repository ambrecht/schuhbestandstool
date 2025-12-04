import { buildSkuKey, normalizeKeyPart } from "./normalization.js";

// Baut einen normalisierten SkuKey-Record aus Rohwerten.
export function makeSkuKey(parts = {}) {
  return {
    artikel: normalizeKeyPart(parts.artikel),
    variante: normalizeKeyPart(parts.variante),
    leiste: normalizeKeyPart(parts.leiste),
    groesse: normalizeKeyPart(parts.groesse),
    qualitaet: normalizeKeyPart(parts.qualitaet),
    lager: normalizeKeyPart(parts.lager),
  };
}

// Serialisiert einen SkuKey in die String-Form "ARTIKEL|VARIANTE|LEISTE|GROESSE|QUALITAET|LAGER".
export function serializeSkuKey(key) {
  if (!key) return "";
  return buildSkuKey(key);
}

// Parst eine serialisierte SKU in die Objektform. Fehlende Teile werden als Leerstring gesetzt.
export function parseSkuKey(serialized) {
  const parts = String(serialized || "").split("|");
  const [artikel = "", variante = "", leiste = "", groesse = "", qualitaet = "", lager = ""] = parts;
  return makeSkuKey({ artikel, variante, leiste, groesse, qualitaet, lager });
}

// Liefert einen stabilen Vergleichsschluessel (z. B. fuer Maps/Sets).
export function skuKeyId(key) {
  return serializeSkuKey(key);
}
