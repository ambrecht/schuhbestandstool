import { useMemo } from "react";
import {
  buildSkuKey,
  normalizeGroesseInventory,
  normalizeKeyPart,
  normalizeNumber,
  normalizeText,
  parseGermanPrice,
} from "../utils/normalization";

// Transforms raw inventory CSV rows into the internal structure without mutating input.
export function useInventory(rawInventoryData) {
  const inventory = useMemo(() => {
    if (!Array.isArray(rawInventoryData)) {
      return [];
    }

    const parsed = rawInventoryData
      .map((row) => mapInventoryRow(row))
      .filter((item) => item !== null);

    return aggregateInventory(parsed);
  }, [rawInventoryData]);

  return { inventory };
}

function mapInventoryRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const artikel = normalizeKeyPart(getField(row, ["artikel", "ARTIKEL"]));
  const variante = normalizeKeyPart(getField(row, ["variante", "VARIANTE"]));
  const leiste = normalizeKeyPart(getField(row, ["leiste", "LEISTE"]));
  const groesse = normalizeGroesseInventory(getField(row, ["groesse", "Groesse", "GROESSE"]));
  const qualitaet = normalizeKeyPart(getField(row, ["qualitaet", "qualitt", "QUALITAET"]));
  const lager = normalizeKeyPart(getField(row, ["lager", "Lager"]));
  const bestand = normalizeNumber(getField(row, ["bestand", "Bestand"]));
  const bestandseinheit = normalizeText(getField(row, ["bestandseinheit", "Bestandseinheit"]));
  const grosshandelspreis = parseGermanPrice(getField(row, ["grohandelspreis", "Grosshandelspreis", "Gro\u00dfhandelspreis"]));

  if (!artikel || !variante || !leiste || !groesse || !lager) {
    return null;
  }

  const sku = buildSkuKey({ artikel, variante, leiste, groesse, qualitaet, lager });

  return {
    sku,
    artikel,
    variante,
    leiste,
    groesse,
    qualitaet,
    lager,
    bestand: bestand ?? 0,
    bestandseinheit,
    grosshandelspreis,
  };
}

function getField(map, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
  }
  return null;
}

function aggregateInventory(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!row || !row.sku) continue;
    const prev = map.get(row.sku);
    const currentStock = Number(row.bestand) || 0;

    if (!prev) {
      map.set(row.sku, { ...row, bestand: currentStock });
    } else {
      map.set(row.sku, {
        ...prev,
        bestand: (Number(prev.bestand) || 0) + currentStock,
      });
    }
  }

  return Array.from(map.values());
}
