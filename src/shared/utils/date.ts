// Date helpers. All dates in the app are plain "YYYY-MM-DD" strings in the
// user's local time zone, so string comparison (a < b) orders them correctly.

export function formatDateIso(dateObj: Date = new Date()): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayString(): string {
  return formatDateIso(new Date());
}

export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateIso(d);
}

/** Parses "YYYY-MM-DD" as a local date (new Date("2026-01-02") would be UTC). */
export function parseIsoDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Monday of the current week. */
export function getStartOfWeek(base: Date = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - offset);
  return formatDateIso(d);
}

/** Sunday of the current week. */
export function getEndOfWeek(base: Date = new Date()): string {
  const start = parseIsoDate(getStartOfWeek(base))!;
  start.setDate(start.getDate() + 6);
  return formatDateIso(start);
}

export function getStartOfMonth(base: Date = new Date()): string {
  return formatDateIso(new Date(base.getFullYear(), base.getMonth(), 1));
}

export function getEndOfMonth(base: Date = new Date()): string {
  return formatDateIso(new Date(base.getFullYear(), base.getMonth() + 1, 0));
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/** Accepts YYYY-MM-DD, YYYY/M/D, D/M/YYYY or anything Date can parse. */
export function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : formatDateIso(value);
  const str = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;

  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : formatDateIso(dt);
}
