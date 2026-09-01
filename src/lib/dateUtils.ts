/**
 * Centralized Date Utilities to prevent Timezone Offset / 1-day behind bugs
 */

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's LOCAL browser timezone
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a future date formatted as YYYY-MM-DD (default 30 days ahead) based on a base date
 */
export function getFutureLocalDateString(daysAhead: number = 30, baseDate: Date = new Date()): string {
  const target = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + daysAhead, 12, 0, 0);
  return getLocalDateString(target);
}

/**
 * Parses any date string (ISO timestamp, YYYY-MM-DD, DD/MM/YYYY) into numerical { year, month, day }
 * safely without timezone conversion bugs.
 */
export function parseDateSafe(dateStr?: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (str.includes('-')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day };
      }
    }
  } else if (str.includes('/')) {
    const parts = str.split(' ')[0].split('/');
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day };
      }
    }
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    }
  } catch {}
  return null;
}

/**
 * Parses date to local midnight (00:00:00.000) for exact calendar day comparisons
 */
export function parseDateToMidnight(dateInput?: string | Date | null): Date {
  if (!dateInput) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (dateInput instanceof Date) {
    const d = new Date(dateInput.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const parsed = parseDateSafe(dateInput);
  if (parsed) {
    return new Date(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0, 0);
  }
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formats any date safely to DD/MM/AAAA (Brazilian Portuguese standard)
 */
export function formatLocalDateBR(dateInput?: string | null | Date, options?: { showTime?: boolean }): string {
  if (!dateInput) return '—';

  if (dateInput instanceof Date) {
    if (options?.showTime) {
      return dateInput.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }
    return dateInput.toLocaleDateString('pt-BR');
  }

  const str = String(dateInput).trim();
  if (!str) return '—';

  const parsed = parseDateSafe(str);
  if (parsed) {
    const dateFormatted = `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${parsed.year}`;
    if (options?.showTime && str.includes('T')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dateFormatted} às ${timePart}`;
      }
    }
    return dateFormatted;
  }

  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  if (options?.showTime) {
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
  return d.toLocaleDateString('pt-BR');
}

/**
 * Extracts the calendar due day (1-31) safely from date string
 */
export function extractDueDay(dateInput?: string | null): string {
  if (!dateInput) return '—';
  const parsed = parseDateSafe(dateInput);
  if (parsed) {
    return String(parsed.day);
  }
  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) {
    return String(d.getDate());
  }
  return '—';
}
