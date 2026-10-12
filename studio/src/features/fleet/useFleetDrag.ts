import { type DragEvent, type HTMLAttributes, useState } from 'react';
import { useStudioPreferences } from '@/providers/StudioPreferencesProvider.tsx';
import { boardOrder, reorderIds } from './fleet-model.ts';

export interface FleetDrag {
  /** Props for the grip: the only part that starts a drag, so text and links stay selectable. */
  handleProps: (workspaceId: string) => HTMLAttributes<HTMLElement> & { draggable: boolean };
  /** Props for the tile itself, which accepts a drop anywhere on its surface. */
  dropProps: (workspaceId: string) => HTMLAttributes<HTMLElement>;
  /** The tile being dragged right now, if any. */
  draggingId: string | null;
  /** The tile the pointer is currently over, if it is a valid drop target. */
  overId: string | null;
  /** Whether a hand-arranged order exists to clear. */
  hasManualOrder: boolean;
  resetOrder: () => void;
  /** Drops deleted workspaces from the saved order, so it does not keep ids that no longer exist. */
  forget: (workspaceIds: string[]) => void;
}

/**
 * Drag-to-reorder for the board, persisted per browser in the studio preferences.
 *
 * Native drag events rather than a library: the board needs one gesture in a two-dimensional grid, which
 * `motion`'s single-axis `Reorder` cannot express, and the saved value is a plain list of ids either way.
 * Because the drop target decides the position, the full board order is written on every drop — including
 * workspaces that had no saved rank, and those the search and filters hide ({@link boardOrder}) — so a board
 * arranged once stays arranged.
 */
export function useFleetDrag(shownIds: string[]): FleetDrag {
  const { preferences, setPreference } = useStudioPreferences();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const clear = () => {
    setDraggingId(null);
    setOverId(null);
  };

  const commit = (id: string, targetId: string) => {
    const order = boardOrder(preferences.fleetOrder, shownIds);
    const next = reorderIds(order, id, targetId);
    if (next !== order) setPreference('fleetOrder', next);
  };

  return {
    draggingId,
    overId,
    hasManualOrder: preferences.fleetOrder.length > 0,
    resetOrder: () => setPreference('fleetOrder', []),
    forget: (workspaceIds) => {
      const gone = new Set(workspaceIds);
      if (preferences.fleetOrder.some((id) => gone.has(id))) {
        setPreference(
          'fleetOrder',
          preferences.fleetOrder.filter((id) => !gone.has(id)),
        );
      }
    },

    handleProps: (workspaceId) => ({
      draggable: true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        setDraggingId(workspaceId);
        event.dataTransfer.effectAllowed = 'move';
        // Firefox starts no drag at all without payload.
        event.dataTransfer.setData('text/plain', workspaceId);
      },
      onDragEnd: clear,
    }),

    dropProps: (workspaceId) => ({
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
