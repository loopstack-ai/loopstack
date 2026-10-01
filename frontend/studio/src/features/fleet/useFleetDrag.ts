import { type DragEvent, type HTMLAttributes, useState } from 'react';
import { useStudioPreferences } from '@/providers/StudioPreferencesProvider.tsx';
import { reorderIds } from './fleet-model.ts';

export interface FleetDrag {
  /** Props to spread on a draggable tile — the whole card or row. */
  handlers: (workspaceId: string) => HTMLAttributes<HTMLElement> & { draggable: boolean };
  /** The tile being dragged right now, if any. */
  draggingId: string | null;
  /** The tile the pointer is currently over, if it is a valid drop target. */
  overId: string | null;
  /** Moves a workspace one place earlier or later — the keyboard's way in, from the card menu. */
  move: (workspaceId: string, direction: -1 | 1) => void;
  /** Whether a hand-arranged order exists to clear. */
  hasManualOrder: boolean;
  resetOrder: () => void;
}

/**
 * Drag-to-reorder for the board, persisted per browser in the studio preferences.
 *
 * Native drag events rather than a library: the board needs one gesture in a two-dimensional grid, which
 * `motion`'s single-axis `Reorder` cannot express, and the saved value is a plain list of ids either way.
 * Because the drop target decides the position, the full visible order is written on every drop — including
 * workspaces that had no saved rank — so a board arranged once stays arranged.
 */
export function useFleetDrag(visibleIds: string[]): FleetDrag {
  const { preferences, setPreference } = useStudioPreferences();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const clear = () => {
    setDraggingId(null);
    setOverId(null);
  };

  const commit = (id: string, targetId: string) => {
    const next = reorderIds(visibleIds, id, targetId);
    if (next !== visibleIds) setPreference('fleetOrder', next);
  };

  return {
    draggingId,
    overId,
    hasManualOrder: preferences.fleetOrder.length > 0,
    resetOrder: () => setPreference('fleetOrder', []),

    move: (workspaceId, direction) => {
      const index = visibleIds.indexOf(workspaceId);
      const target = visibleIds[index + direction];
      if (target) commit(workspaceId, target);
    },

    handlers: (workspaceId) => ({
      draggable: true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        setDraggingId(workspaceId);
        event.dataTransfer.effectAllowed = 'move';
        // Firefox starts no drag at all without payload.
        event.dataTransfer.setData('text/plain', workspaceId);
      },
      onDragEnd: clear,
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!draggingId || draggingId === workspaceId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (overId !== workspaceId) setOverId(workspaceId);
      },
      onDragLeave: () => {
        if (overId === workspaceId) setOverId(null);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        if (draggingId && draggingId !== workspaceId) commit(draggingId, workspaceId);
        clear();
      },
    }),
  };
}
