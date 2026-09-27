const TIMEZONE = 'Asia/Kolkata';
const LOCALE = 'en-IN';

/**
 * Format a Date or ISO string as a readable date.
 * Example: '03 Sep 2026'
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TIMEZONE
  });
}

/**
 * Format a Date or ISO string as a readable date with time.
 * Example: '03 Sep 2026, 11:45 AM'
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: TIMEZONE
  });
}

/**
 * Format as relative time (e.g., '2 hours ago', 'yesterday').
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(d);
}

/**
 * Format a billing period.
 * Example: 'Aug 2026' or 'Aug 2026 - Sep 2026'
 */
export function formatBillingPeriod(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  const startStr = s.toLocaleDateString(LOCALE, { month: 'short', year: 'numeric', timeZone: TIMEZONE });
  const endStr = e.toLocaleDateString(LOCALE, { month: 'short', year: 'numeric', timeZone: TIMEZONE });
  if (startStr === endStr) return startStr;
  return `${startStr} \u2013 ${endStr}`;
}

/**
 * Get ordinal suffix for a day number.
 * 1 -> '1st', 2 -> '2nd', 3 -> '3rd', 4 -> '4th'
 */
export function ordinalDay(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}
