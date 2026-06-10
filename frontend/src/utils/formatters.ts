/**
 * Formats an ISO date string to a human-readable format.
 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Formats a decimal score into a percentage string (e.g. 0.723 -> 72.3%).
 */
export function formatPercent(score: number): string {
  if (score === undefined || score === null) return '0%';
  return `${Math.round(score * 100)}%`;
}

/**
 * Sanitizes and splits structured logs if needed, or formats JSON logs.
 */
export function formatJSON(obj: Record<string, unknown>): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

/**
 * Formats raw snake_case strings into capitalized space-separated strings.
 */
export function formatLabel(snakeCase: string): string {
  if (!snakeCase) return '';
  return snakeCase
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
