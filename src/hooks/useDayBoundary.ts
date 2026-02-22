/**
 * Hook for detecting day boundary crossings (midnight) in user's timezone
 *
 * Uses polling with absolute time comparison to detect when the date changes.
 * This avoids timer drift issues that occur with incremental counters.
 *
 * Used by useTimezone to provide auto-updating date strings.
 */
import { useState, useEffect, useRef } from 'react';
import { getUserTodayDateString, getYesterdayDateString } from '@/lib/timezone';

/** Polling interval in milliseconds (60 seconds) */
const POLL_INTERVAL_MS = 60_000;

interface UseDayBoundaryResult {
  /** Today's date string in user's timezone (YYYY-MM-DD) - updates at midnight */
  currentDateString: string;
  /** Yesterday's date string in user's timezone (YYYY-MM-DD) - updates at midnight */
  yesterdayDateString: string;
}

/**
 * Detects day boundary crossings and provides reactive date strings
 *
 * @param timezone - IANA timezone name (e.g., "America/New_York")
 * @returns Object with currentDateString and yesterdayDateString that update at midnight
 *
 * @example
 * const { currentDateString, yesterdayDateString } = useDayBoundary('America/New_York');
 * // At 11:59 PM: currentDateString = "2026-01-31"
 * // At 12:00 AM: currentDateString = "2026-02-01" (auto-updates)
 */
export function useDayBoundary(timezone: string): UseDayBoundaryResult {
  const [currentDateString, setCurrentDateString] = useState(() =>
    getUserTodayDateString(timezone)
  );

  // Use ref to track previous date for comparison without causing re-renders
  const previousDateRef = useRef(currentDateString);

  useEffect(() => {
    // Update ref when timezone changes
    const initialDate = getUserTodayDateString(timezone);
    previousDateRef.current = initialDate;
    setCurrentDateString(initialDate);

    // Poll every 60 seconds using absolute time comparison
    // This avoids timer drift that occurs with incrementing counters
    const interval = setInterval(() => {
      const newDateString = getUserTodayDateString(timezone);

      // Only update state if day actually changed
      if (newDateString !== previousDateRef.current) {
        previousDateRef.current = newDateString;
        setCurrentDateString(newDateString);
      }
    }, POLL_INTERVAL_MS);

    // Cleanup interval on unmount or timezone change
    return () => clearInterval(interval);
  }, [timezone]);

  // Compute yesterday's date string from current date
  // This will also update when currentDateString updates (at midnight)
  const yesterdayDateString = getYesterdayDateString(timezone);

  return {
    currentDateString,
    yesterdayDateString,
  };
}
