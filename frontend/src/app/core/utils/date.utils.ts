/**
 * Format a Date as local YYYY-MM-DD for API date range params.
 * Avoids UTC conversion so "today" and "N days ago" match the user's calendar.
 */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
