import { describe, it, expect } from 'vitest';
import { cn, safeParseISO, safeFormatDate } from './utils';

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
