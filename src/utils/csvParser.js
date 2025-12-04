// Lightweight CSV parser for browser File inputs; handles , or ; delimiters and basic quoting.
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve([]);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        resolve(parseCSVText(text));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

// Allows parsing raw CSV text (e.g., default dev data) without a File object.
export function parseCSVText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const delimiter = detectDelimiter(lines);
  const headers = parseRow(lines[0], delimiter)
    .map((h) => normalizeHeader(h))
    .filter(Boolean);

  if (!headers.length) {
    return [];
  }

  const records = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseRow(lines[i], delimiter);

    if (!cells.length || cells.length !== headers.length) {
      continue; // skip malformed or incomplete rows
    }

    const entry = {};

    for (let j = 0; j < headers.length; j += 1) {
      const header = headers[j];
      entry[header] = normalizeValue(cells[j]);
    }

    records.push(entry);
  }

  return records;
}

function detectDelimiter(lines) {
  const candidates = [",", ";"];
  const sample = lines.slice(0, 2);

  const counts = candidates.map((delimiter) =>
    sample.reduce((sum, line) => sum + countDelimiter(line, delimiter), 0),
  );

  const maxCount = Math.max(...counts);
  const index = counts.indexOf(maxCount);

  return candidates[index] || ",";
}

function countDelimiter(line, delimiter) {
  const matches = line.match(new RegExp(`\\${delimiter}`, "g"));
  return matches ? matches.length : 0;
}

function parseRow(line, delimiter) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];

      if (inQuotes && nextChar === '"') {
        current += '"'; // escaped quote
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

// Hypothesis: groesse cells arrive empty because hidden BOM/zero-width/nbsp chars survive trimming and strip content; sanitize value before numeric detection.
function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const asString = typeof value === "number" ? value.toString() : String(value);

  const cleaned = asString
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200F]/g, "")
    .replace(/\u00A0/g, " ")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  const numericPattern = /^[+-]?\d+(?:[.,]\d+)?$/;

  if (numericPattern.test(cleaned)) {
    const parsed = parseFloat(cleaned.replace(",", "."));
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return cleaned;
}

function normalizeHeader(h) {
  const normalized = h
    .trim()
    .normalize("NFC")
    .replace(/^\uFEFF/, "")
    .replace(/[\r\n]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\uFFFD\uFFFD/g, "oess")
    .replace(/\uFFFD/g, "")
    .replace(/[\u00c4\u00e4]/g, "ae")
    .replace(/[\u00d6\u00f6]/g, "oe")
    .replace(/[\u00dc\u00fc]/g, "ue")
    .replace(/\u00df/g, "ss")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  if (normalized === "gr\uFFFD\uFFFDe") {
    return "groesse";
  }

  if (normalized === "nderungsdatum") {
    return "aenderungsdatum";
  }

  return normalized;
}
