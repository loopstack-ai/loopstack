import { formatDistanceToNowStrict } from 'date-fns';
import { Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import SortableTableHead from '@/components/data-table/SortableTableHead';
import { Badge } from '@/components/ui/badge.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';
import { cn } from '@/lib/utils.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';
import NewWorkspaceTile from './NewWorkspaceTile.tsx';
import WorkspaceActionsMenu from './WorkspaceActionsMenu.tsx';
import type { FleetEntry, FleetSort, FleetSortField } from './fleet-model.ts';
import { STATE_ICON, STATE_LABEL, STATE_TEXT } from './fleet-presentation.ts';

/** Every column, the checkbox included, for a cell that spans the whole row. */
const COLUMN_COUNT = 10;

interface FleetTableProps {
  entries: FleetEntry[];
  sort: FleetSort;
  onSortChange: (sort: FleetSort) => void;
  /** The selected workspaces among `entries`. */
  selected: string[];
  onSelectedChange: (workspaceId: string) => void;
  onSelectAll: () => void;
  onFilterApp: (appName: string) => void;
  onDelete: (workspaceId: string) => void;
}

function FleetRow({
  entry,
  isSelected,
  onSelectedChange,
  onFilterApp,
  onDelete,
}: {
  entry: FleetEntry;
  isSelected: boolean;
  onSelectedChange: () => void;
  onFilterApp: (appName: string) => void;
  onDelete: (workspaceId: string) => void;
}) {
  const { router } = useStudio();
  const { workspace, state, runs } = entry;

  // The row shows the run that speaks for the workspace, and counts it with the others.
  const lead = runs[0];
  const run = lead?.active ?? lead?.root;
  const StateIcon = STATE_ICON[state];

  return (
    <TableRow className={cn(isSelected && 'bg-muted/50')}>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={onSelectedChange} aria-label={`Select ${workspace.title}`} />
      </TableCell>
      <TableCell>
        <span className={cn('flex items-center gap-2', STATE_TEXT[state])}>
          {StateIcon && <StateIcon className={cn('size-4 shrink-0', state === 'working' && 'animate-spin')} />}
          {STATE_LABEL[state]}
        </span>
      </TableCell>
      <TableCell className="whitespace-normal">
        <Link to={router.getWorkspace(workspace.id)} className="hover:text-primary font-medium">
          {workspace.title}
        </Link>
        {workspace.labels.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {workspace.labels.map((label) => (
              <Badge key={label} variant="outline" className="text-muted-foreground max-w-48 font-normal">
                <span className="truncate">{label}</span>
              </Badge>
            ))}
          </span>
        )}
      </TableCell>
      <TableCell>
        <button
          type="button"
          onClick={() => onFilterApp(workspace.appName)}
          title={`Filter by ${workspace.appName}`}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {workspace.appName}
        </button>
      </TableCell>
      <TableCell>
        {run ? (
          <Link
            to={router.getWorkflow(run.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary flex items-center gap-2"
          >
            <span>
              <span className="text-muted-foreground">#{run.run}</span> {run.workflowName}
            </span>
            <code className="text-muted-foreground font-mono text-xs">{run.place}</code>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{runs.length}</TableCell>
      <TableCell className="text-muted-foreground">
        {run ? `${formatDistanceToNowStrict(new Date(run.createdAt))} ago` : '—'}
      </TableCell>
      <TableCell className="text-muted-foreground">{new Date(workspace.createdAt).toLocaleString()}</TableCell>
      <TableCell className="text-center">
        {workspace.isFavourite && (
          <Star className="inline size-4 fill-current text-yellow-500" aria-label="Favourite" />
        )}
      </TableCell>
      <TableCell className="text-right">
        <WorkspaceActionsMenu workspace={workspace} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  );
}

/**
 * The dashboard's list view: one row per workspace, sorted by the column whose header was clicked.
 *
 * Only the workspace's own columns sort, because the workspace API orders them across every page. The run
 * columns are computed in the browser for the page on screen, so a sort by them would order one page only.
 */
export default function FleetTable({
  entries,
  sort,
  onSortChange,
  selected,
  onSelectedChange,
  onSelectAll,
  onFilterApp,
  onDelete,
}: FleetTableProps) {
  const sortableHead = (field: FleetSortField, label: ReactNode, className?: string) => (
    <SortableTableHead
      className={className}
      label={label}
      sorted={sort.field === field ? sort.order : undefined}
      onSort={() => onSortChange({ field, order: sort.field === field && sort.order === 'ASC' ? 'DESC' : 'ASC' })}
    />
  );

  return (
    <div className="border-border bg-card overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={entries.length > 0 && selected.length === entries.length}
                onCheckedChange={onSelectAll}
                aria-label="Select all workspaces"
              />
            </TableHead>
            <TableHead>State</TableHead>
            {sortableHead('title', 'Title')}
            {sortableHead('appName', 'App')}
            <TableHead>Run</TableHead>
            <TableHead className="text-right">Active runs</TableHead>
            <TableHead>Started</TableHead>
            {sortableHead('createdAt', 'Created')}
            {sortableHead(
              'isFavourite',
              <>
                <Star className="size-4" aria-hidden />
                <span className="sr-only">Favourite</span>
              </>,
              'text-center',
            )}
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <FleetRow
              key={entry.workspace.id}
              entry={entry}
              isSelected={selected.includes(entry.workspace.id)}
              onSelectedChange={() => onSelectedChange(entry.workspace.id)}
              onFilterApp={onFilterApp}
              onDelete={onDelete}
            />
          ))}
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={COLUMN_COUNT} className="p-2">
              <NewWorkspaceTile variant="row" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
