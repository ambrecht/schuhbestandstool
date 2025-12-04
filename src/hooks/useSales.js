import { useMemo } from "react";
import { buildSku, normalizeNumber, normalizeSize, normalizeText } from "../utils/normalization";

// Transforms raw sales CSV rows into the internal structure without mutating input.
export function useSales(rawSalesData) {
  const sales = useMemo(() => {
    if (!Array.isArray(rawSalesData)) {
      return [];
    }

    return rawSalesData
      .map((row) => mapSalesRow(row))
      .filter((item) => item !== null);
  }, [rawSalesData]);

  return { sales };
}

function mapSalesRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const artikel = normalizeText(getField(row, ["artikel", "ARTIKEL"]));
  const variante = normalizeText(getField(row, ["variante", "VARIANTE"]));
  const leiste = normalizeText(getField(row, ["leiste", "LEISTE"]));
  const groesse = normalizeSize(row);
  const menge = normalizeNumber(getField(row, ["menge", "Menge"]));
  const datum = toDateValue(getField(row, ["änderungsdatum", "aenderungsdatum", "datum", "Datum"]));

  const sku = buildSku({ artikel, variante, leiste, groesse });

  return {
    sku,
    artikel,
    variante,
    leiste,
    groesse,
    menge: menge ?? 0,
    datum,
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

function toDateValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsedGerman = parseGermanDate(String(value));
  if (parsedGerman) return parsedGerman;

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseGermanDate(raw) {
  const trimmed = String(raw || "").trim();
  // Matches DD.MM.YYYY or DD.MM.YYYY HH:MM[:SS]
  const match = trimmed.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!match) return null;
  const [, dd, mm, yyyy, hh = "0", min = "0", ss = "0"] = match;
  const year = Number(yyyy.length === 2 ? `20${yyyy}` : yyyy);
  const month = Number(mm) - 1;
  const day = Number(dd);
  const hours = Number(hh);
  const minutes = Number(min);
  const seconds = Number(ss);

  const date = new Date(year, month, day, hours, minutes, seconds);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
