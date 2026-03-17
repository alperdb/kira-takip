/**
 * Centralised Turkish-locale formatting utilities.
 * Use these everywhere instead of inline toLocaleString calls.
 */

const _num  = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const _date = new Intl.DateTimeFormat('tr-TR');
const _mon  = new Intl.DateTimeFormat('tr-TR', { month: 'short', year: 'numeric' });
const _long = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' });

/** ₺1.234,56 */
export function money(
  amount: number | string | { toString(): string },
  currency = '₺',
): string {
  return `${currency}${_num.format(Number(amount))}`;
}

/** 15.03.2026 — returns '—' for missing or invalid input */
export function date(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return _date.format(dt);
}

/** 15 Mart 2026 — returns '—' for missing or invalid input */
export function dateLong(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return _long.format(dt);
}

/** Mar 2026 — returns '—' for missing or invalid input */
export function month(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return _mon.format(dt);
}

/** First initial uppercase — for avatar fallbacks */
export function initial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase('tr-TR');
}
