import { FolderOpen, MoreHorizontal, Pencil, Play, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkspaceInterface } from '@loopstack/contracts/api';
import ConfirmDialog from '@/components/data-table/ConfirmDialog';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent } from '@/components/ui/dialog.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import DefaultCreateWorkspace from '@/features/workspaces/components/CreateWorkspace.tsx';
import NewWorkflowRunDialog from '@/features/workspaces/components/NewWorkflowRunDialog.tsx';
import { useAppTypes } from '@/features/workspaces/useAppTypes.ts';
import { useDeleteWorkspace, useSetFavouriteWorkspace } from '@/hooks/useWorkspaces.ts';
import { cn } from '@/lib/utils.ts';
import { useComponentOverrides } from '@/providers/ComponentOverridesProvider.tsx';
import { useStudio } from '@/providers/StudioProvider.tsx';

interface WorkspaceActionsMenuProps {
  workspace: WorkspaceInterface;
  /** Called once the deletion is confirmed. */
  onDelete?: (workspaceId: string) => void;
  className?: string;
}

/** Everything one workspace offers on the board — the same menu on a card and on a list row. */
export default function WorkspaceActionsMenu({ workspace, onDelete, className }: WorkspaceActionsMenuProps) {
  const { router } = useStudio();
  const { EditWorkspace: EditWorkspaceOverride } = useComponentOverrides();
  const EditWorkspace = EditWorkspaceOverride ?? DefaultCreateWorkspace;
  const { types } = useAppTypes();

  const [newRunOpen, setNewRunOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const setFavourite = useSetFavouriteWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('text-muted-foreground size-7 shrink-0', className)}
            aria-label={`Actions for ${workspace.title}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setNewRunOpen(true)}>
            <Play />
            Run
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={router.getWorkspace(workspace.id)}>
              <FolderOpen />
              Open
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setFavourite.mutate({ id: workspace.id, isFavourite: !workspace.isFavourite })}
          >
            <Star className={cn(workspace.isFavourite && 'fill-current')} />
            {workspace.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewWorkflowRunDialog
        isOpen={newRunOpen}
        onOpenChange={setNewRunOpen}
        workspace={workspace}
        onSuccess={() => setNewRunOpen(false)}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <EditWorkspace types={types} workspace={workspace} onSuccess={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Deleting a workspace takes its runs with it, so it asks first. */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${workspace.title}?`}
        description="The workspace and every run in it are removed. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => {
          deleteWorkspace.mutate(workspace.id);
          onDelete?.(workspace.id);
          setDeleteOpen(false);
        }}
      />
    </>
  );
}
