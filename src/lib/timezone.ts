/**
 * Timezone utilities for the application
 * Following "store UTC, display local" pattern
 *
 * Uses date-fns-tz v3 API (toZonedTime, fromZonedTime, formatInTimeZone)
 */
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format, isSameDay } from 'date-fns';

const DEFAULT_TIMEZONE = 'UTC';

/**
 * Get user's browser timezone using Intl API
 * Returns IANA timezone name (e.g., "America/New_York")
 */
export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Format a UTC date for display in user's timezone
 * @param date - Date object or ISO string (UTC)
 * @param timezone - IANA timezone name
 * @param formatStr - date-fns format string
 */
export function formatInUserTimezone(
  date: Date | string,
  timezone: string,
  formatStr: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, timezone || DEFAULT_TIMEZONE, formatStr);
}

/**
 * Get today's date string (YYYY-MM-DD) in user's timezone
 * Used for querying scheduled_date column
 *
 * CRITICAL: This is the core function for TIME-03 (daily rollover)
 */
export function getUserTodayDateString(timezone: string): string {
  const now = new Date();
  const userNow = toZonedTime(now, timezone || DEFAULT_TIMEZONE);
  return format(userNow, 'yyyy-MM-dd');
}

/**
 * Check if a date matches "today" in user's timezone
 * Used for UI highlighting and filtering
 */
export function isDateToday(date: Date | string, timezone: string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return isSameDay(
    toZonedTime(dateObj, timezone || DEFAULT_TIMEZONE),
    toZonedTime(now, timezone || DEFAULT_TIMEZONE)
  );
}

/**
 * Get all available IANA timezones for selector
 * Uses Intl API with fallback for older browsers
 */
export function getAllTimezones(): string[] {
  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  // Fallback for older browsers - common timezones only
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Dubai',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
  ];
}

/**
 * Get friendly display name for timezone
 * Shows city name with current offset
 */
export function getTimezoneDisplayName(timezone: string): string {
  try {
    const now = new Date();
    // Get offset string (e.g., "GMT-5")
    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = offsetFormatter.formatToParts(now);
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || '';

    // Format: "America/New_York" -> "New York (GMT-5)"
    const cityName = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
    return `${cityName} (${offset})`;
  } catch {
    return timezone;
  }
}

/**
 * Check if a timezone string is valid IANA timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
