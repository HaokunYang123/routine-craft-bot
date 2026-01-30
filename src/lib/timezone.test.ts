import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectBrowserTimezone,
  formatInUserTimezone,
  getUserTodayDateString,
  isDateToday,
  getAllTimezones,
  getTimezoneDisplayName,
  isValidTimezone,
} from './timezone';

describe('timezone utilities', () => {
  describe('detectBrowserTimezone', () => {
    it('returns a valid timezone string', () => {
      const tz = detectBrowserTimezone();
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    });

    it('returns UTC as fallback when Intl fails', () => {
      const originalIntl = globalThis.Intl;
      // @ts-expect-error - testing fallback
      globalThis.Intl = undefined;
      expect(detectBrowserTimezone()).toBe('UTC');
      globalThis.Intl = originalIntl;
    });
  });

  describe('formatInUserTimezone', () => {
    it('formats UTC date in specified timezone', () => {
      // Jan 15, 2026 at noon UTC
      const utcDate = new Date('2026-01-15T12:00:00Z');

      // In New York (UTC-5), this is 7:00 AM
      const nyResult = formatInUserTimezone(utcDate, 'America/New_York', 'h:mm a');
      expect(nyResult).toBe('7:00 AM');

      // In Tokyo (UTC+9), this is 9:00 PM
      const tokyoResult = formatInUserTimezone(utcDate, 'Asia/Tokyo', 'h:mm a');
      expect(tokyoResult).toBe('9:00 PM');
    });

    it('accepts ISO string input', () => {
      const result = formatInUserTimezone('2026-01-15T12:00:00Z', 'UTC', 'yyyy-MM-dd');
      expect(result).toBe('2026-01-15');
    });

    it('uses UTC as fallback for empty timezone', () => {
      const result = formatInUserTimezone(new Date('2026-01-15T12:00:00Z'), '', 'HH:mm');
      expect(result).toBe('12:00');
    });
  });

  describe('getUserTodayDateString', () => {
    beforeEach(() => {
      // Mock Date to a known value: Jan 15, 2026, 3:00 AM UTC
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T03:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns correct date for UTC', () => {
      expect(getUserTodayDateString('UTC')).toBe('2026-01-15');
    });

    it('returns previous day for late night in western timezone', () => {
      // At 3:00 AM UTC, it's 10:00 PM previous day in New York (UTC-5)
      expect(getUserTodayDateString('America/New_York')).toBe('2026-01-14');
    });

    it('returns same day for eastern timezone', () => {
      // At 3:00 AM UTC, it's noon in Tokyo (UTC+9)
      expect(getUserTodayDateString('Asia/Tokyo')).toBe('2026-01-15');
    });
  });

  describe('isDateToday', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true for today in same timezone', () => {
      expect(isDateToday(new Date('2026-01-15T08:00:00Z'), 'UTC')).toBe(true);
    });

    it('returns false for yesterday', () => {
      expect(isDateToday(new Date('2026-01-14T08:00:00Z'), 'UTC')).toBe(false);
    });

    it('handles timezone boundaries correctly', () => {
      // At noon UTC Jan 15, in New York (UTC-5) it's 7am Jan 15
      // Jan 15 3am UTC = Jan 14 10pm NY (different day from "now" which is 7am Jan 15 NY)
      expect(isDateToday(new Date('2026-01-15T03:00:00Z'), 'America/New_York')).toBe(false);
      // Jan 15 14:00 UTC = Jan 15 9am NY (same day as "now" which is 7am Jan 15 NY)
      expect(isDateToday(new Date('2026-01-15T14:00:00Z'), 'America/New_York')).toBe(true);
    });
  });

  describe('getAllTimezones', () => {
    it('returns an array of timezone strings', () => {
      const timezones = getAllTimezones();
      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
    });

    it('includes common timezones', () => {
      const timezones = getAllTimezones();
      expect(timezones).toContain('America/New_York');
      expect(timezones).toContain('Europe/London');
      expect(timezones).toContain('Asia/Tokyo');
    });
  });

  describe('getTimezoneDisplayName', () => {
    it('returns formatted display name', () => {
      const display = getTimezoneDisplayName('America/New_York');
      expect(display).toContain('New York');
      expect(display).toMatch(/GMT[+-]\d/);
    });

    it('handles single-part timezone names', () => {
      const display = getTimezoneDisplayName('UTC');
      expect(display).toContain('UTC');
    });
  });

  describe('isValidTimezone', () => {
    it('returns true for valid IANA timezones', () => {
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    });

    it('returns false for invalid timezone strings', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('NotA/RealTimezone')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });
  });
});
