/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Normalizes any date string (ISO date, DD/MM/YYYY, YYYY/MM/DD, with or without time)
 * into a standardized `YYYY-MM-DD` date string for accurate, layout-independent comparisons.
 */
export function normalizeDateToISO(dateStr: string | any): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (!str) return '';

  // If it's a standard ISO string or timestamp (contains 'T', 'Z' or ':'),
  // prefer native Date parsing to obtain the exact LOCAL timezone YYYY-MM-DD date.
  if (str.includes('T') || str.includes('Z') || str.includes(':') || /^\d{4}-\d{2}-\d{2}/.test(str)) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // ignore and fallback
    }
  }

  // Case 1: Already YYYY-MM-DD ... (e.g., 2026-06-16 or 2026/06/16)
  const ymdRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
  const matchYmd = str.match(ymdRegex);
  if (matchYmd) {
    const year = matchYmd[1];
    const month = matchYmd[2].padStart(2, '0');
    const day = matchYmd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Case 2: DD/MM/YYYY or DD-MM-YYYY ... (extremely common in Google Sheet locales like UK/Arabic)
  const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/;
  const matchDmy = str.match(dmyRegex);
  if (matchDmy) {
    const day = matchDmy[1].padStart(2, '0');
    const month = matchDmy[2].padStart(2, '0');
    const year = matchDmy[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback to standard JS Date parsing
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.warn('Silent fallback error:', e);
  }

  return str;
}

/**
 * Parses any timestamp string (including DD/MM/YYYY with time, YYYY-MM-DD, ISO formats)
 * into numeric milliseconds for accurate, browser-independent chronological comparisons.
 */
export function parseDateTimeToMs(timestampStr: string | any): number {
  if (!timestampStr) return 0;
  const str = String(timestampStr).trim();
  if (!str) return 0;

  // DD/MM/YYYY with or without time (e.g., 16/06/2026 15:30:00)
  const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/;
  const matchDmy = str.match(dmyRegex);
  if (matchDmy) {
    const day = parseInt(matchDmy[1], 10);
    const month = parseInt(matchDmy[2], 10) - 1; // 0-based month
    const year = parseInt(matchDmy[3], 10);
    const hour = matchDmy[4] ? parseInt(matchDmy[4], 10) : 0;
    const minute = matchDmy[5] ? parseInt(matchDmy[5], 10) : 0;
    const second = matchDmy[6] ? parseInt(matchDmy[6], 10) : 0;
    return new Date(year, month, day, hour, minute, second).getTime();
  }

  // YYYY-MM-DD with or without time
  const ymdRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+T?(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/;
  const matchYmd = str.match(ymdRegex);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const month = parseInt(matchYmd[2], 10) - 1;
    const day = parseInt(matchYmd[3], 10);
    const hour = matchYmd[4] ? parseInt(matchYmd[4], 10) : 0;
    const minute = matchYmd[5] ? parseInt(matchYmd[5], 10) : 0;
    const second = matchYmd[6] ? parseInt(matchYmd[6], 10) : 0;
    return new Date(year, month, day, hour, minute, second).getTime();
  }

  const parsed = Date.parse(str);
  return isNaN(parsed) ? 0 : parsed;
}

