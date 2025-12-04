const DAY_MS = 24 * 60 * 60 * 1000;

export function getSalesDateRange(sales) {
  const dates = (Array.isArray(sales) ? sales : [])
    .map((s) => (s?.datum instanceof Date ? s.datum : null))
    .filter((d) => d && !Number.isNaN(d.getTime()));

  if (!dates.length) return { min: null, max: null };

  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  return { min: startOfDay(min), max: startOfDay(max) };
}

export function buildDefaultPeriod(range) {
  if (range?.min instanceof Date && range?.max instanceof Date) {
    const spanDays = calculateDays(range.min, range.max);
    // Default to a recency-focused window if the dataset spans mehrere Monate/Jahre,
    // otherwise stick to the exact CSV range.
    if (spanDays > 120) {
      return buildRelativePeriod("last30", range.max);
    }
    return {
      key: "dataset",
      label: "CSV-Zeitraum",
      start: startOfDay(range.min),
      end: startOfDay(range.max),
    };
  }
  const reference = pickReferenceDate(range);
  return buildRelativePeriod("last90", reference);
}

export function buildRelativePeriod(key, referenceDate) {
  const ref = startOfDay(referenceDate || new Date());
  switch (key) {
    case "last30":
      return {
        key,
        label: "Letzte 30 Tage",
        start: addDays(ref, -29),
        end: ref,
      };
    case "last90":
      return {
        key,
        label: "Letzte 90 Tage",
        start: addDays(ref, -89),
        end: ref,
      };
    case "summer": {
      const year = ref.getFullYear();
      // 01.04. - 30.09.
      return {
        key,
        label: "Sommer-Saison",
        start: new Date(year, 3, 1),
        end: new Date(year, 8, 30),
      };
    }
    case "winter": {
      // 01.10. - 31.03. (spanning years)
      const month = ref.getMonth();
      const startYear = month >= 9 ? ref.getFullYear() : ref.getFullYear() - 1;
      return {
        key,
        label: "Winter-Saison",
        start: new Date(startYear, 9, 1),
        end: new Date(startYear + 1, 2, 31),
      };
    }
    default:
      return {
        key: "all",
        label: "Gesamter Zeitraum",
        start: null,
        end: null,
      };
  }
}

export function ensurePeriod(period, range) {
  const fallback = buildDefaultPeriod(range);
  const start = period?.start ? startOfDay(period.start) : fallback.start;
  const end = period?.end ? startOfDay(period.end) : fallback.end;
  const key = period?.key || fallback.key;
  const label = period?.label || fallback.label;

  const normalized = normalizeRange(start, end);
  const bounded = clampToRange(normalized, range);

  return {
    key,
    label,
    start: bounded.start,
    end: bounded.end,
    daysInPeriod: calculateDays(bounded.start, bounded.end),
  };
}

export function filterSalesByPeriod(sales, period) {
  const list = Array.isArray(sales) ? sales : [];
  if (!period?.start || !period?.end) return list;
  const start = startOfDay(period.start);
  const end = startOfDay(period.end);

  return list.filter((sale) => {
    const date = sale?.datum instanceof Date ? sale.datum : null;
    if (!date || Number.isNaN(date.getTime())) return false;
    const day = startOfDay(date).getTime();
    return day >= start.getTime() && day <= end.getTime();
  });
}

export function calculateDays(start, end) {
  if (!start || !end) return 0;
  const startTime = startOfDay(start).getTime();
  const endTime = startOfDay(end).getTime();
  const diff = Math.max(0, endTime - startTime);
  return Math.floor(diff / DAY_MS) + 1;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  return new Date(startOfDay(date).getTime() + days * DAY_MS);
}

function normalizeRange(start, end) {
  if (!start || !end) return { start, end };
  const startTime = startOfDay(start).getTime();
  const endTime = startOfDay(end).getTime();
  if (startTime <= endTime) {
    return { start: startOfDay(start), end: startOfDay(end) };
  }
  return { start: startOfDay(end), end: startOfDay(start) };
}

function pickReferenceDate(range) {
  if (range?.max instanceof Date && !Number.isNaN(range.max.getTime())) {
    return range.max;
  }
  return new Date();
}

function clampToRange(candidate, baseRange) {
  if (!baseRange?.min || !baseRange?.max) return candidate;
  const minTime = startOfDay(baseRange.min).getTime();
  const maxTime = startOfDay(baseRange.max).getTime();
  const startTime = candidate.start ? startOfDay(candidate.start).getTime() : minTime;
  const endTime = candidate.end ? startOfDay(candidate.end).getTime() : maxTime;

  const clampedStart = new Date(Math.max(minTime, startTime));
  const clampedEnd = new Date(Math.min(maxTime, endTime));

  if (clampedStart.getTime() > clampedEnd.getTime()) {
    return { start: startOfDay(baseRange.min), end: startOfDay(baseRange.max) };
  }

  return { start: clampedStart, end: clampedEnd };
}
