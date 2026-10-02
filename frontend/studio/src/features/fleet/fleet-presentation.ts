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

/**
 * The dot beside a workspace's name. It repeats what {@link STATE_ICON} says next to the run, on purpose:
 * the dots sit in one column down the board, so a glance reads the fleet without reading any card.
 */
export const STATE_DOT: Record<FleetState, string> = {
  waiting: 'bg-yellow-500',
  working: 'bg-blue-500 animate-pulse',
  queued: 'bg-muted-foreground/50',
  idle: 'bg-muted-foreground/25',
};

export const STATE_TEXT: Record<FleetState, string> = {
  waiting: 'text-yellow-600 dark:text-yellow-400',
  working: 'text-blue-600 dark:text-blue-400',
  queued: 'text-muted-foreground',
  idle: 'text-muted-foreground',
};

/**
 * How tall a board tile stands. Every card carries it, idle ones included, so the grid tiles evenly
 * whatever each workspace happens to be doing — and the new-workspace placeholder matches.
 */
export const TILE_MIN_HEIGHT = 'min-h-56';

/** How old the run is — `createdAt`, so it keeps counting no matter what the run does. */
export function runAge(distance: string): string {
  return `started ${distance} ago`;
}
