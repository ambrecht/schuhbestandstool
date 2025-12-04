import { useMemo } from "react";
import { normalizeNumber, normalizeSize, normalizeText, buildSku } from "../utils/normalization";

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

  const artikel = normalizeText(getField(row, ["artikel", "ARTIKEL"]));
  const variante = normalizeText(getField(row, ["variante", "VARIANTE"]));
  const leiste = normalizeText(getField(row, ["leiste", "LEISTE"]));
  const groesse = normalizeSize(row);
  const bestand = normalizeNumber(getField(row, ["bestand", "Bestand"]));
  const bestandseinheit = normalizeText(getField(row, ["bestandseinheit", "Bestandseinheit"]));

  const sku = buildSku({ artikel, variante, leiste, groesse });

  return {
    sku,
    artikel,
    variante,
    leiste,
    groesse,
    bestand: bestand ?? 0,
    bestandseinheit,
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
