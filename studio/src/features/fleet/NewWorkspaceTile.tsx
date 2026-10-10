import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog.tsx';
import DefaultCreateWorkspace from '@/features/workspaces/components/CreateWorkspace.tsx';
import { useAppTypes } from '@/features/workspaces/useAppTypes.ts';
import { cn } from '@/lib/utils.ts';
import { useComponentOverrides } from '@/providers/ComponentOverridesProvider.tsx';
import { TILE_MIN_HEIGHT } from './fleet-presentation.ts';

interface NewWorkspaceTileProps {
  /** `card` closes the grid, `row` closes the list. */
  variant: 'card' | 'row';
}

/**
 * The empty slot at the end of the board: where the next workspace goes.
 *
 * Drawn as a tile rather than offered as a button elsewhere, so adding one reads as filling the next place
 * in the fleet. It hosts the same create dialog the workspaces list uses, overrides included — the cloud
 * frontend replaces it with its own form.
 */
export default function NewWorkspaceTile({ variant }: NewWorkspaceTileProps) {
  const { CreateWorkspace: CreateWorkspaceOverride } = useComponentOverrides();
  const CreateWorkspace = CreateWorkspaceOverride ?? DefaultCreateWorkspace;
  const [open, setOpen] = useState(false);

  const { types } = useAppTypes();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed transition-colors',
          variant === 'card' ? `h-full w-full ${TILE_MIN_HEIGHT}` : 'w-full px-4 py-2 text-sm',
        )}
      >
        <Plus className="size-4" />
        <span className={cn(variant === 'card' && 'text-sm')}>New workspace</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <CreateWorkspace types={types} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
