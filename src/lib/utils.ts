import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISO, format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse an ISO date string. Returns null if invalid.
 */
export function safeParseISO(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  try {
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
