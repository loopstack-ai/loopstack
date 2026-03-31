import { useMemo, useState } from 'react';
import type { FilterOption } from '../../components/data-table/data-table.ts';
import ItemListView from '../../components/lists/ListView.tsx';
import type { Column } from '../../components/lists/ListView.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip.tsx';
import { useDebounce } from '../../hooks/useDebounce.ts';
import { useBatchDeleteWorkflows, useDeleteWorkflow, useFilterWorkflows } from '../../hooks/useWorkflows.ts';
import { useFilterWorkspaces } from '../../hooks/useWorkspaces.ts';
import { useStudio } from '../../providers/StudioProvider.tsx';

const statusColors: Record<string, string> = {
  completed: 'bg-green-50 text-green-900 border-green-200',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  canceled: 'bg-orange-50 text-orange-900 border-orange-200',
  running: 'bg-blue-50 text-blue-900 border-blue-200',
  paused: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  pending: 'bg-muted text-muted-foreground border-border',
};

interface RunsProps {
  defaultFilters?: Record<string, string>;
}

const Runs = ({ defaultFilters = {} }: RunsProps) => {
  const { router } = useStudio();

  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [searchTerm, setSearchTerm] = useState<string | undefined>();
  const [filters, setFilters] = useState<Record<string, string>>(defaultFilters);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const mergedFilters: Record<string, string | null> = { ...filters, parentId: null };

  const fetchWorkflows = useFilterWorkflows(debouncedSearchTerm, mergedFilters, orderBy, order, page, rowsPerPage);
  const fetchWorkspaces = useFilterWorkspaces(undefined, {}, 'title', 'ASC', 0, 100);

  const deleteWorkflow = useDeleteWorkflow();
  const batchDeleteWorkflows = useBatchDeleteWorkflows();

  const workspaceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ws of fetchWorkspaces.data?.data ?? []) {
      map.set(ws.id, ws.title);
    }
    return map;
  }, [fetchWorkspaces.data]);

  const workspaceFilterOptions: FilterOption[] = useMemo(() => {
    return (fetchWorkspaces.data?.data ?? []).map((ws) => ({
      label: ws.title,
      value: ws.id,
    }));
  }, [fetchWorkspaces.data]);

  const blockNameFilterOptions: FilterOption[] = useMemo(() => {
    const names = new Set<string>();
    for (const p of fetchWorkflows.data?.data ?? []) {
      if (p.blockName) names.add(p.blockName);
    }
    return Array.from(names).sort();
  }, [fetchWorkflows.data]);

  const handleDelete = (id: string) => {
    deleteWorkflow.mutate(id);
  };

  const handleBatchDelete = (ids: string[]) => {
    batchDeleteWorkflows.mutate(ids);
  };

  const handleRunClick = (id: string) => {
    void router.navigateToWorkflow(id);
  };

  return (
    <ItemListView
      loading={fetchWorkflows.isPending}
      error={fetchWorkflows.error ?? null}
      items={fetchWorkflows.data?.data ?? []}
      totalItems={fetchWorkflows.data?.total ?? 0}
      setPage={setPage}
      setRowsPerPage={setRowsPerPage}
      setOrderBy={setOrderBy}
      setOrder={setOrder}
      setSearchTerm={setSearchTerm}
      setFilters={setFilters}
      orderBy={orderBy}
      order={order}
      searchTerm={searchTerm}
      filters={filters}
      page={page}
      rowsPerPage={rowsPerPage}
      deleteItem={handleDelete}
      onClick={handleRunClick}
      enableBatchActions={true}
      batchDelete={handleBatchDelete}
      columns={
        [
          {
            id: 'run',
            label: 'Run',
            minWidth: 60,
            format: (value: unknown) => {
              const num = value as number | undefined;
              return num != null ? `#${num}` : '—';
            },
          },
          {
            id: 'workspaceId',
            label: 'Workspace',
            minWidth: 120,
            format: (value: unknown) => {
              const wsId = value as string;
              const title = workspaceMap.get(wsId);
              return (
                <Badge
                  variant="outline"
                  className="hover:bg-primary/10 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilters((curr) => ({ ...curr, workspaceId: wsId }));
                  }}
                >
                  {title ?? wsId.slice(0, 8)}
                </Badge>
              );
            },
          },
          {
            id: 'blockName',
            label: 'Type',
            minWidth: 100,
            format: (value: unknown) => {
              const name = value as string;
              return (
                <Badge
                  variant="outline"
                  className="hover:bg-primary/10 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilters((curr) => ({ ...curr, blockName: name }));
                  }}
                >
                  {name}
                </Badge>
              );
            },
          },
          {
            id: 'title',
            label: 'Title',
            minWidth: 150,
            format: (value: unknown) => {
              const title = value as string | undefined;
              if (!title) return '—';
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{title.length > 40 ? title.slice(0, 40) + '...' : title}</span>
                    </TooltipTrigger>
                    {title.length > 40 && (
                      <TooltipContent>
                        <p>{title}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            },
          },
          {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            format: (value: unknown) => {
              const status = value as string;
              const color = statusColors[status] || 'bg-muted text-muted-foreground border-border';
              return (
                <Badge className={`rounded-full border px-2 py-1 text-xs whitespace-nowrap ${color}`}>{status}</Badge>
              );
            },
          },
          {
            id: 'createdAt',
            label: 'Date Created',
            minWidth: 100,
            format: (value: unknown) => new Date(value as string).toLocaleDateString(),
          },
        ] as Column[]
      }
      filterConfig={{
        status: ['pending', 'running', 'paused', 'completed', 'failed', 'canceled'],
        workspaceId: workspaceFilterOptions,
        blockName: blockNameFilterOptions,
      }}
    />
  );
};

export default Runs;
