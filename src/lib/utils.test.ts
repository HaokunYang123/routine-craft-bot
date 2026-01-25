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
