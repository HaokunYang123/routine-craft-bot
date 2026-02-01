import { describe, it, expect } from 'vitest';
import { cn, safeParseISO, safeFormatDate, generateTimeSlots, minutesToTimeString } from './utils';

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn('base', isActive && 'active', isDisabled && 'disabled');
    expect(result).toBe('base active');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    // tailwind-merge resolves conflicts: p-4 vs p-2, p-2 wins
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('handles undefined and null', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles empty strings', () => {
    const result = cn('foo', '', 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('handles object syntax', () => {
    const result = cn('base', { active: true, disabled: false });
    expect(result).toBe('base active');
  });
});

describe('safeParseISO', () => {
  // Valid ISO strings
  it('returns Date for date-only ISO string', () => {
    const result = safeParseISO('2024-01-15');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(0); // January is 0
    expect(result?.getDate()).toBe(15);
  });

  it('returns Date for full ISO string with Z', () => {
    const result = safeParseISO('2024-01-15T10:30:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
  });

  it('returns Date for ISO string with milliseconds', () => {
    const result = safeParseISO('2024-01-15T10:30:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
  });

  // Invalid strings
  it('returns null for non-date string', () => {
    const result = safeParseISO('not-a-date');
    expect(result).toBeNull();
  });

  it('returns null for invalid month/day', () => {
    const result = safeParseISO('2024-13-45');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = safeParseISO('');
    expect(result).toBeNull();
  });

  // Null and undefined
  it('returns null for null input', () => {
    const result = safeParseISO(null);
    expect(result).toBeNull();
  });

  it('returns null for undefined input', () => {
    const result = safeParseISO(undefined);
    expect(result).toBeNull();
  });
});

describe('safeFormatDate', () => {
  // Valid date formatting
  it('formats date with "MMM d, yyyy" format', () => {
    const result = safeFormatDate('2024-01-15', 'MMM d, yyyy');
    expect(result).toBe('Jan 15, 2024');
  });

  it('formats ISO datetime with "yyyy-MM-dd" format', () => {
    const result = safeFormatDate('2024-01-15T10:30:00Z', 'yyyy-MM-dd');
    expect(result).toBe('2024-01-15');
  });

  it('formats ISO datetime with "HH:mm" for time extraction', () => {
    const result = safeFormatDate('2024-01-15T10:30:00Z', 'HH:mm');
    // Note: time may vary by timezone, so we just verify it returns a valid time format
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  // Invalid input handling
  it('returns default fallback for null', () => {
    const result = safeFormatDate(null, 'yyyy-MM-dd');
    expect(result).toBe('No date');
  });

  it('returns default fallback for undefined', () => {
    const result = safeFormatDate(undefined, 'yyyy-MM-dd');
    expect(result).toBe('No date');
  });

  it('returns default fallback for invalid date string', () => {
    const result = safeFormatDate('invalid-date', 'yyyy-MM-dd');
    expect(result).toBe('No date');
  });

  // Custom fallback
  it('returns custom fallback "N/A" for null', () => {
    const result = safeFormatDate(null, 'yyyy-MM-dd', 'N/A');
    expect(result).toBe('N/A');
  });

  it('returns custom fallback "-" for invalid string', () => {
    const result = safeFormatDate('invalid-date', 'yyyy-MM-dd', '-');
    expect(result).toBe('-');
  });
});

describe('cn edge cases', () => {
  it('handles deeply nested arrays', () => {
    const result = cn(['a', ['b', ['c']]]);
    expect(result).toBe('a b c');
  });

  it('handles multiple Tailwind color conflicts', () => {
    // bg-red-500 should be overridden by bg-blue-500
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('handles responsive variants correctly', () => {
    const result = cn('p-2', 'md:p-4', 'lg:p-6');
    expect(result).toBe('p-2 md:p-4 lg:p-6');
  });

  it('handles hover/focus states', () => {
    const result = cn('hover:bg-blue-500', 'hover:bg-red-500');
    expect(result).toBe('hover:bg-red-500');
  });

  it('returns empty string for all falsy values', () => {
    const result = cn(undefined, null, false, '');
    expect(result).toBe('');
  });

  it('handles complex real-world example', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'px-4 py-2 rounded-md',
      'bg-primary text-white',
      isActive && 'ring-2 ring-offset-2',
      isDisabled && 'opacity-50 cursor-not-allowed',
      { 'font-bold': isActive }
    );
    expect(result).toBe('px-4 py-2 rounded-md bg-primary text-white ring-2 ring-offset-2 font-bold');
  });
});

describe('safeParseISO edge cases', () => {
  it('handles Feb 29 on leap year', () => {
    const result = safeParseISO('2024-02-29'); // 2024 is a leap year
    expect(result).toBeInstanceOf(Date);
    expect(result?.getMonth()).toBe(1); // February
    expect(result?.getDate()).toBe(29);
  });

  it('returns null for Feb 29 on non-leap year', () => {
    const result = safeParseISO('2023-02-29'); // 2023 is not a leap year
    expect(result).toBeNull();
  });

  it('returns null for Feb 30 (invalid day)', () => {
    const result = safeParseISO('2024-02-30');
    expect(result).toBeNull();
  });

  it('returns null for April 31 (invalid day)', () => {
    const result = safeParseISO('2024-04-31');
    expect(result).toBeNull();
  });

  it('handles year boundaries correctly', () => {
    const dec31 = safeParseISO('2024-12-31');
    expect(dec31?.getFullYear()).toBe(2024);
    expect(dec31?.getMonth()).toBe(11);
    expect(dec31?.getDate()).toBe(31);

    const jan1 = safeParseISO('2025-01-01');
    expect(jan1?.getFullYear()).toBe(2025);
    expect(jan1?.getMonth()).toBe(0);
    expect(jan1?.getDate()).toBe(1);
  });

  it('returns null for month 0', () => {
    const result = safeParseISO('2024-00-15');
    expect(result).toBeNull();
  });

  it('returns null for day 0', () => {
    const result = safeParseISO('2024-01-00');
    expect(result).toBeNull();
  });

  it('handles ISO string with timezone offset', () => {
    const result = safeParseISO('2024-01-15T10:30:00+05:30');
    expect(result).toBeInstanceOf(Date);
  });
});

describe('generateTimeSlots', () => {
  it('returns an array of time slot objects', () => {
    const slots = generateTimeSlots();
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty('value');
    expect(slots[0]).toHaveProperty('label');
  });

  it('starts at 5:00 AM with value 300 (5*60)', () => {
    const slots = generateTimeSlots();
    expect(slots[0].label).toBe('05:00 AM');
    expect(slots[0].value).toBe(300); // 5 * 60 minutes
  });

  it('ends at 10:00 PM with value 1320 (22*60)', () => {
    const slots = generateTimeSlots();
    expect(slots[slots.length - 1].label).toBe('10:00 PM');
    expect(slots[slots.length - 1].value).toBe(1320); // 22 * 60 minutes
  });

  it('does not include 10:30 PM', () => {
    const slots = generateTimeSlots();
    const labels = slots.map(s => s.label);
    expect(labels).not.toContain('10:30 PM');
  });

  it('has 30-minute increments', () => {
    const slots = generateTimeSlots();
    const labels = slots.map(s => s.label);
    // Check a few consecutive slots
    const idx = labels.indexOf('06:00 AM');
    expect(labels[idx + 1]).toBe('06:30 AM');
    expect(labels[idx + 2]).toBe('07:00 AM');
  });

  it('correctly handles AM/PM transition at noon', () => {
    const slots = generateTimeSlots();
    const labels = slots.map(s => s.label);
    expect(labels).toContain('11:30 AM');
    expect(labels).toContain('12:00 PM');
    expect(labels).toContain('12:30 PM');
    expect(labels).toContain('01:00 PM');
  });

  it('returns correct number of slots (5AM-10PM = 17 hours * 2 + 1 = 35 slots)', () => {
    const slots = generateTimeSlots();
    // From 5:00 AM to 10:00 PM in 30-min increments
    // 5:00, 5:30, 6:00, ... 10:00 (excluding 10:30)
    // Hours: 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22
    // That's 18 hours - 1 (no 10:30) = 17 * 2 + 1 = 35 slots
    expect(slots.length).toBe(35);
  });

  it('formats hours with leading zeros', () => {
    const slots = generateTimeSlots();
    const labels = slots.map(s => s.label);
    expect(labels).toContain('05:00 AM');
    expect(labels).toContain('09:30 AM');
  });

  it('uses 12-hour format', () => {
    const slots = generateTimeSlots();
    const labels = slots.map(s => s.label);
    // Should not have 13:00, should have 01:00 PM
    expect(labels.some(s => s.startsWith('13:'))).toBe(false);
    expect(labels).toContain('01:00 PM');
  });

  it('has correct value (minutes from midnight) for 9:00 AM', () => {
    const slots = generateTimeSlots();
    const nineAm = slots.find(s => s.label === '09:00 AM');
    expect(nineAm?.value).toBe(540); // 9 * 60
  });

  it('has correct value (minutes from midnight) for 5:00 PM', () => {
    const slots = generateTimeSlots();
    const fivePm = slots.find(s => s.label === '05:00 PM');
    expect(fivePm?.value).toBe(1020); // 17 * 60
  });
});

describe('minutesToTimeString', () => {
  it('converts midnight (0) to 12:00 AM', () => {
    expect(minutesToTimeString(0)).toBe('12:00 AM');
  });

  it('converts 540 minutes (9 AM) correctly', () => {
    expect(minutesToTimeString(540)).toBe('9:00 AM');
  });

  it('converts 1020 minutes (5 PM) correctly', () => {
    expect(minutesToTimeString(1020)).toBe('5:00 PM');
  });

  it('converts 720 minutes (noon) to 12:00 PM', () => {
    expect(minutesToTimeString(720)).toBe('12:00 PM');
  });

  it('handles half-hour correctly', () => {
    expect(minutesToTimeString(570)).toBe('9:30 AM');
    expect(minutesToTimeString(810)).toBe('1:30 PM');
  });

  it('converts 1439 (11:59 PM) correctly', () => {
    expect(minutesToTimeString(1439)).toBe('11:59 PM');
  });

  it('handles morning hours (1-11 AM)', () => {
    expect(minutesToTimeString(60)).toBe('1:00 AM');
    expect(minutesToTimeString(660)).toBe('11:00 AM');
  });

  it('handles afternoon hours (1-11 PM)', () => {
    expect(minutesToTimeString(780)).toBe('1:00 PM');
    expect(minutesToTimeString(1380)).toBe('11:00 PM');
  });
});
