import { useMemo } from "react";
import {
  buildSkuKey,
  normalizeGroesseSales,
  normalizeKeyPart,
  normalizeNumber,
  normalizeText,
  parseGermanPrice,
} from "../utils/normalization";

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

  const status = normalizeKeyPart(getField(row, ["status", "Status"]));
  if (status && status !== "ABGESCHLOSSEN") return null;

  const kategorie = normalizeKeyPart(getField(row, ["kategorie", "Kategorie"]));
  if (kategorie && kategorie !== "SCHUH") return null;

  const artikel = normalizeKeyPart(getField(row, ["artikel", "ARTIKEL"]));
  const variante = normalizeKeyPart(getField(row, ["variante", "VARIANTE"]));
  const leiste = normalizeKeyPart(getField(row, ["leiste", "LEISTE"]));
  const groesse = normalizeGroesseSales(getField(row, ["groesse", "Groesse", "GROESSE"]));
  const qualitaet = normalizeKeyPart(getField(row, ["qualitaet", "qualitt", "QUALITAET"]));
  const lager = normalizeKeyPart(getField(row, ["lager", "Lager"]));
  if (!artikel || !variante || !leiste || !groesse || !lager) {
    return null;
  }

  const anmerkung = normalizeText(getField(row, ["anmerkung", "Anmerkung"]));
  const anmerkungUpper = normalizeKeyPart(anmerkung);
  if (["FLOHMARKT", "SPENDE"].some((kw) => anmerkungUpper.includes(kw))) return null;
  if (anmerkungUpper.includes("TRANSFER") && !anmerkungUpper.includes("KUNDE")) return null;

  const typ = normalizeKeyPart(getField(row, ["typ", "Typ"]));
  if (typ && typ.includes("TRANSFER") && !typ.includes("KUNDE")) return null;

  const menge = normalizeNumber(getField(row, ["menge", "Menge"]));
  const datum = toDateValue(getField(row, ["ادnderungsdatum", "aenderungsdatum", "datum", "Datum"]));
  const verkaufspreis = parseGermanPrice(getField(row, ["verkaufspreis", "Verkaufspreis"]));

  const sku = buildSkuKey({ artikel, variante, leiste, groesse, qualitaet, lager });

  return {
    sku,
    artikel,
    variante,
    leiste,
    groesse,
    qualitaet,
    lager,
    menge: menge ?? 0,
    datum,
    verkaufspreis,
    kategorie,
    status,
    anmerkung,
    typ,
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
