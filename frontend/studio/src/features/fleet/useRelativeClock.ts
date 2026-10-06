import { useEffect, useState } from 'react';

/**
 * Re-renders on a fixed interval so relative times stay honest.
 *
 * A run's `updatedAt` only changes when the engine writes, so a card parked at "14 min" would otherwise
 * still say "14 min" an hour later — and on this board the age of a wait is the signal. One timer per
 * board, not one per card.
 */
export function useRelativeClock(intervalMs = 30_000): void {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
}
