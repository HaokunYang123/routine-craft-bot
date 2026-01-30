/**
 * Hook providing user's timezone and formatting helpers
 *
 * Usage:
 *   const { timezone, formatDate, todayDateString } = useTimezone();
 *   const display = formatDate(task.created_at, 'MMM d, h:mm a');
 */
import { useProfile } from './useProfile';
import {
  detectBrowserTimezone,
  getUserTodayDateString,
  formatInUserTimezone,
  isDateToday as checkIsDateToday,
} from '@/lib/timezone';

export function useTimezone() {
  const { profile, loading } = useProfile();

  // User's stored timezone, or browser-detected as fallback
  const timezone = profile?.timezone || detectBrowserTimezone();

  /**
   * Format a date/timestamp in user's timezone
   * @param date - Date object or ISO string
   * @param formatStr - date-fns format string (e.g., 'MMM d, h:mm a')
   */
  const formatDate = (date: Date | string, formatStr: string): string => {
    return formatInUserTimezone(date, timezone, formatStr);
  };

  /**
   * Get today's date string (YYYY-MM-DD) in user's timezone
   * Use this for scheduled_date queries
   */
  const todayDateString = getUserTodayDateString(timezone);

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
    /** Today's date string for DB queries */
    todayDateString,
    /** Check if date is today in user's timezone */
    isDateToday,
  };
}
