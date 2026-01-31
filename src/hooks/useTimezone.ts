/**
 * Hook providing user's timezone and formatting helpers
 *
 * Usage:
 *   const { timezone, formatDate, todayDateString } = useTimezone();
 *   const display = formatDate(task.created_at, 'MMM d, h:mm a');
 */
import { useProfile } from './useProfile';
import { useDayBoundary } from './useDayBoundary';
import {
  detectBrowserTimezone,
  formatInUserTimezone,
  isDateToday as checkIsDateToday,
} from '@/lib/timezone';

export function useTimezone() {
  const { profile, loading } = useProfile();

  // User's stored timezone, or browser-detected as fallback
  const timezone = profile?.timezone || detectBrowserTimezone();

  // Day boundary detection - provides auto-updating date strings at midnight
  const { currentDateString, yesterdayDateString } = useDayBoundary(timezone);

  /**
   * Format a date/timestamp in user's timezone
   * @param date - Date object or ISO string
   * @param formatStr - date-fns format string (e.g., 'MMM d, h:mm a')
   */
  const formatDate = (date: Date | string, formatStr: string): string => {
    return formatInUserTimezone(date, timezone, formatStr);
  };

  /**
   * Check if a date is "today" in user's timezone
   */
  const isDateToday = (date: Date | string): boolean => {
    return checkIsDateToday(date, timezone);
  };

  return {
    /** IANA timezone name (e.g., "America/New_York") */
    timezone,
    /** Whether profile (and thus timezone) is still loading */
    loading,
    /** Whether timezone has been explicitly set (vs detected) */
    isTimezoneSet: !!profile?.timezone,
    /** Format a date in user's timezone */
    formatDate,
    /** Today's date string for DB queries - auto-updates at midnight */
    todayDateString: currentDateString,
    /** Yesterday's date string for DB queries - auto-updates at midnight */
    yesterdayDateString,
    /** Check if date is today in user's timezone */
    isDateToday,
  };
}
