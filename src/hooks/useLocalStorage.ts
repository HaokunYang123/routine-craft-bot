import { useState, useCallback } from 'react';

/**
 * Persist state to localStorage with automatic serialization.
 * Falls back to defaultValue if localStorage is unavailable or value is invalid.
 *
 * @param key - The localStorage key to use
 * @param defaultValue - Default value when no stored value exists
 * @returns Tuple of [value, setValue] similar to useState
 *
 * @example
 * const [pageSize, setPageSize] = useLocalStorage('page-size', 25);
 * setPageSize(50); // Persists to localStorage
 * setPageSize(prev => prev * 2); // Functional updates supported
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch {
          // localStorage full or unavailable - silently fail
        }
        return newValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
