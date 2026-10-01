import { Clock, Loader2, PauseCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FleetState } from './fleet-model.ts';

/** The word for each state — the accessible name behind {@link STATE_ICON}, and the list view's column. */
export const STATE_LABEL: Record<FleetState, string> = {
  waiting: 'Waiting for you',
  working: 'Working',
  queued: 'Queued',
  idle: 'Idle',
};

/**
 * The marker that carries a card's state, set beside the run it belongs to. `idle` has none: a card with no
 * run says it already, and an icon for "nothing is happening" is noise in a grid of twenty.
 */
export const STATE_ICON: Record<FleetState, LucideIcon | null> = {
  waiting: PauseCircle,
  working: Loader2,
  queued: Clock,
  idle: null,
};

export const STATE_TEXT: Record<FleetState, string> = {
  waiting: 'text-yellow-600 dark:text-yellow-400',
  working: 'text-blue-600 dark:text-blue-400',
  queued: 'text-muted-foreground',
  idle: 'text-muted-foreground',
};

/** How old the run is — `createdAt`, so it keeps counting no matter what the run does. */
export function runAge(distance: string): string {
  return `started ${distance} ago`;
}

/**
 * How long the run has been in its current state, from `updatedAt` — the attention strip's number, and what
 * it sorts on. A run parked since Tuesday is only visible as such here; its age would say the same for a run
 * that has been working the whole time.
 */
export function timeInState(state: FleetState, distance: string): string {
  switch (state) {
    case 'waiting':
      return `waiting ${distance}`;
    case 'queued':
      return `queued ${distance}`;
    default:
      return `active ${distance}`;
  }
}
