import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // For string search inputs: skip debounce for 1-2 character strings.
    // This avoids firing searches for partial input that's too short to be meaningful,
    // while still debouncing empty (cleared) input and 3+ character queries.
    if (typeof value === 'string') {
      const len = (value as string).length;
      if (len > 0 && len < 3) {
        return;
      }
    }

    const timerId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timerId);
    };
  }, [value, delay]);

  return debouncedValue;
}
