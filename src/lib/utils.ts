import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISO, format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse a date string as LOCAL time, not UTC.
 * This fixes the "California Disappearing Task" bug where parseISO("2026-01-26")
 * is treated as midnight UTC, which is 4PM the previous day in PST.
 *
 * For date-only strings (YYYY-MM-DD), parse as local midnight.
 * For full ISO strings with time, use standard parseISO.
 */
export function safeParseISO(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  try {
    // Check if it's a date-only string (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Parse as local time by constructing the date manually
      const [year, month, day] = dateString.split('-').map(Number);

      // Validate month and day ranges before creating date
      // JavaScript Date constructor rolls over invalid dates, so we must validate
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
      }

      const localDate = new Date(year, month - 1, day); // month is 0-indexed

      // Additional check: verify the date components match what we put in
      // This catches cases like Feb 30 -> Mar 2 (JS rolls over)
      if (
        localDate.getFullYear() !== year ||
        localDate.getMonth() !== month - 1 ||
        localDate.getDate() !== day
      ) {
        return null;
      }

      return isValid(localDate) ? localDate : null;
    }

    // For full ISO strings (with time), use parseISO
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Safely format a date string. Returns fallback if invalid.
 */
export function safeFormatDate(
  dateString: string | null | undefined,
  formatStr: string,
  fallback: string = "No date"
): string {
  const parsed = safeParseISO(dateString);
  if (!parsed) return fallback;
  try {
    return format(parsed, formatStr);
  } catch {
    return fallback;
  }
}
