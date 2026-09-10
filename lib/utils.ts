/**
 * Format a date value to Indonesian date format (DD/MM/YYYY)
 * @param date - Date string, Date object, or any value accepted by Date constructor
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format a date value with full month name in Indonesian
 * e.g. "10 September 2026"
 */
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a date value with short month name in Indonesian
 * e.g. "10 Sep 2026"
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
