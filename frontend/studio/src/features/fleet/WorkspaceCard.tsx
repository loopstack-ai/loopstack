import { formatDistanceToNowStrict } from 'date-fns';
import { CornerDownRight, FolderOpen, GripVertical, MoreHorizontal, Pencil, Play, Star, Trash2 } from 'lucide-react';
import { type HTMLAttributes, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '@/components/data-table/ConfirmDialog';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
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
import type { FleetEntry } from './fleet-model.ts';
import { STATE_DOT, STATE_ICON, STATE_LABEL, STATE_TEXT, TILE_MIN_HEIGHT, runAge } from './fleet-presentation.ts';

interface WorkspaceCardProps {
  entry: FleetEntry;
  handleProps: HTMLAttributes<HTMLElement> & { draggable: boolean };
  dropProps: HTMLAttributes<HTMLElement>;
  isDragging: boolean;
  isDropTarget: boolean;
}

export default function WorkspaceCard({ entry, handleProps, dropProps, isDragging, isDropTarget }: WorkspaceCardProps) {
  const { router } = useStudio();
  const { EditWorkspace: EditWorkspaceOverride } = useComponentOverrides();
  const EditWorkspace = EditWorkspaceOverride ?? DefaultCreateWorkspace;
  const { types } = useAppTypes();

  const [newRunOpen, setNewRunOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const setFavourite = useSetFavouriteWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  const { workspace, state, run, rootRun, moreRuns } = entry;

  const StateIcon = STATE_ICON[state];

  return (
    // The Card primitive ships its own padding and gaps; this card lays out its own rows instead. The
    // min-height keeps an idle card the same size as a busy one, so the grid stays an even surface.
    <Card
      {...dropProps}
      className={cn(
        'group/card flex h-full flex-row gap-0 overflow-hidden p-0 transition-shadow',
        TILE_MIN_HEIGHT,
        isDragging && 'opacity-40',
        isDropTarget && 'ring-primary ring-2',
      )}
    >
      {/* The grip runs the card's full height: the whole left edge is the thing you grab. */}
      <div
        {...handleProps}
        aria-label={`Reorder ${workspace.title}`}
        className="bg-muted/30 hover:bg-muted flex w-5 shrink-0 cursor-grab items-center justify-center border-r transition-colors active:cursor-grabbing"
      >
        <GripVertical className="text-muted-foreground/30 group-hover/card:text-muted-foreground/70 size-3.5 transition-colors" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-3 pt-3">
          <span className={cn('size-2 shrink-0 rounded-full', STATE_DOT[state])} aria-hidden />
          <Link
            to={router.getWorkspace(workspace.id)}
            draggable={false}
            className="hover:text-primary truncate font-semibold"
          >
            {workspace.title}
          </Link>
          {workspace.isFavourite && <Star className="size-3.5 shrink-0 fill-current text-yellow-500" />}
          <span className="text-muted-foreground ml-auto shrink-0 truncate text-xs">{workspace.appName}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground -mr-1.5 size-7 shrink-0"
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
        </div>

        {run && (
          <div className="mt-1 pb-3 text-sm">
            {/* What the sub-workflow is part of. Its own link, so you can open the run that was started
                rather than the gate three levels inside it. */}
            {rootRun && (
              <Link
                to={router.getWorkflow(rootRun.id)}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                className="hover:bg-muted/40 block truncate px-3 py-0.5 transition-colors"
              >
                <span className="text-muted-foreground">#{rootRun.run}</span> {rootRun.workflowName}
              </Link>
            )}

            {/* The run that carries the state — a real anchor, so cmd-click and middle-click keep working
                and the board stays open behind the tab it opens. */}
            <Link
              to={router.getWorkflow(run.id)}
              target="_blank"
              rel="noopener noreferrer"
              draggable={false}
              className={cn(
                'hover:bg-muted/40 flex gap-2 px-3 py-0.5 transition-colors',
                rootRun && 'border-border ml-5 border-l pl-2',
              )}
            >
              {rootRun && <CornerDownRight className="text-muted-foreground/60 mt-0.5 size-3.5 shrink-0" />}
              {StateIcon && (
                <StateIcon
                  className={cn('mt-0.5 size-4 shrink-0', STATE_TEXT[state], state === 'working' && 'animate-spin')}
                  aria-label={STATE_LABEL[state]}
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  <span className="text-muted-foreground">#{run.run}</span> {run.workflowName}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {state === 'waiting' ? 'parked at' : 'at'} <code className="font-mono">{run.place}</code> ·{' '}
                  {runAge(formatDistanceToNowStrict(new Date(run.createdAt)))}
                  {moreRuns > 0 && ` · ${moreRuns + 1} active runs`}
                </span>
              </span>
            </Link>
          </div>
        )}
      </div>

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
          setDeleteOpen(false);
        }}
      />
    </Card>
  );
}
