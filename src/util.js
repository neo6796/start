import { getSetting } from './db.js';

// ---- date helpers (all dates are 'YYYY-MM-DD' strings, UTC-agnostic) ----
export function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export function parseDate(s) {
  // Interpret as a plain calendar date at midnight UTC.
  return new Date(`${s}T00:00:00Z`);
}

export function addDays(s, n) {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

export function todayStr() {
  return isoDate(new Date());
}

// Monday-based week start
export function startOfWeek(s) {
  const d = parseDate(s);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  return addDays(s, -dow);
}

// Resolve a reporting period into an inclusive [from, to] date range.
export function periodRange(period, ref) {
  const r = ref || todayStr();
  const d = parseDate(r);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (period) {
    case 'day':
      return { from: r, to: r };
    case 'week': {
      const from = startOfWeek(r);
      return { from, to: addDays(from, 6) };
    }
    case 'month': {
      const from = isoDate(new Date(Date.UTC(y, m, 1)));
      const to = isoDate(new Date(Date.UTC(y, m + 1, 0)));
      return { from, to };
    }
    case 'year':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    default:
      return { from: r, to: r };
  }
}

// Deadline for ordering/cancelling a given service date.
// Global rule: `cutoff_days_before` days before service date at `cutoff_time`.
// An optional per-date override may exist in date_deadlines.
export function deadlineFor(serviceDate, deadlineOverride) {
  if (deadlineOverride) return new Date(deadlineOverride);
  const daysBefore = Number(getSetting('cutoff_days_before', '1'));
  const time = getSetting('cutoff_time', '10:00');
  const deadlineDate = addDays(serviceDate, -daysBefore);
  return new Date(`${deadlineDate}T${time}:00`);
}

export function isPastDeadline(serviceDate, deadlineOverride, now = new Date()) {
  return now.getTime() > deadlineFor(serviceDate, deadlineOverride).getTime();
}

// ---- money ----
export function centsToStr(cents) {
  return (cents / 100).toFixed(2);
}

// ---- CSV ----
export function toCsv(rows, columns) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.header)).join(';');
  const body = rows
    .map((row) => columns.map((c) => esc(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(';'))
    .join('\n');
  return `${header}\n${body}\n`;
}

export function parseCsv(text) {
  // Minimal RFC-4180-ish parser supporting ';' or ',' delimiters and quotes.
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delim = firstLine.split(';').length >= firstLine.split(',').length ? ';' : ',';
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      record.push(field); field = '';
    } else if (ch === '\n') {
      record.push(field); rows.push(record); field = ''; record = [];
    } else if (ch === '\r') {
      // ignore
    } else field += ch;
  }
  if (field.length > 0 || record.length > 0) { record.push(field); rows.push(record); }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
}
