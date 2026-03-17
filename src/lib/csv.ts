/**
 * Shared CSV export utilities.
 * All formatters are locale-independent (no ICU dependency).
 */

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/**
 * Formats a date as "17 Mart 2026" using LOCAL time methods so the
 * displayed date matches the machine's timezone (UTC+3 for Turkey).
 *
 * Why local, not UTC:
 *   Prisma/SQLite sometimes stores datetimes without an explicit Z suffix
 *   (e.g. "2026-03-17T00:00:00"). Node.js interprets those as local time.
 *   getUTCDate() on a UTC+3 machine then returns the previous day.
 *   getDate() / getMonth() / getFullYear() always give the local calendar date.
 *
 * Excel safety: "17 Mart 2026" is a text string — Excel cannot parse it as
 * a numeric date serial, so it never shows #######.
 */
export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getDate()} ${TR_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

/**
 * Formats a number as Turkish currency: "₺1.234,56"
 * Guards against NaN and Infinity which break toFixed().
 */
export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!isFinite(v) || isNaN(v)) return '₺0,00';
  const [intPart, decPart] = v.toFixed(2).split('.');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `₺${intFormatted},${decPart}`;
}

/**
 * Wraps each field in double-quotes (escaping internal quotes), trims
 * accidental whitespace from text values, and joins with semicolon delimiter.
 */
export function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields
    .map(f => `"${String(f ?? '').trim().replace(/"/g, '""')}"`)
    .join(';');
}
