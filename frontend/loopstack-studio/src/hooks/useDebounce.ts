import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // For string values, apply special logic: only debounce if undefined, empty, or 3+ chars
    if (typeof value === 'string') {
      const stringValue = value as string;

      if (value === undefined || stringValue === '' || stringValue.length >= 3) {
        const timerId = setTimeout(() => {
          setDebouncedValue(value);
        }, delay);

        return () => {
          clearTimeout(timerId);
        };
      }
      return;
    } else {
      const timerId = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(timerId);
      };
    }
  }, [value, delay]);

  return debouncedValue;
}
