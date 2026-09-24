import { useMemo, useState } from 'react';
import type { WorkflowItemInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { FilterOption } from '../../components/data-table/data-table.ts';
import ItemListView from '../../components/lists/ListView.tsx';
import type { Column } from '../../components/lists/ListView.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { useDebounce } from '../../hooks/useDebounce.ts';
import { useBatchDeleteWorkflows, useDeleteWorkflow, useFilterWorkflows } from '../../hooks/useWorkflows.ts';
import { useFilterWorkspaces } from '../../hooks/useWorkspaces.ts';
import { getWorkflowStateColor, needsInput } from '../../lib/run-status.ts';
import { useStudio } from '../../providers/StudioProvider.tsx';

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
  // Scoped to top-level runs by default, as a *visible* filter rather than a hidden default: the chip says
  // why sub-executions are missing, and clearing it is how you find a gate buried three levels down.
  const [filters, setFilters] = useState<Record<string, string>>({ runs: 'top', ...defaultFilters });
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // `runs` is the view's own control, not a column — it becomes the API's `topLevel` question.
  const { runs: runScope, ...columnFilters } = filters;
  const mergedFilters: Record<string, string | boolean | null> = {
    ...columnFilters,
    ...(runScope === 'top' ? { topLevel: true } : {}),
  };

  const fetchWorkflows = useFilterWorkflows(debouncedSearchTerm, mergedFilters, orderBy, order, page, rowsPerPage);
  const fetchWorkspaces = useFilterWorkspaces(undefined, {}, 'title', 'ASC', 0, 100);

  const deleteWorkflow = useDeleteWorkflow();
  const batchDeleteWorkflows = useBatchDeleteWorkflows();

  const workspaceMap = useMemo(() => {
    const map = new Map<string, { title: string; appName: string }>();
    for (const ws of fetchWorkspaces.data?.data ?? []) {
      map.set(ws.id, { title: ws.title, appName: ws.appName });
    }
    return map;
  }, [fetchWorkspaces.data]);

  const workspaceFilterOptions: FilterOption[] = useMemo(() => {
    return (fetchWorkspaces.data?.data ?? []).map((ws) => ({
      label: ws.title,
      value: ws.id,
    }));
  }, [fetchWorkspaces.data]);

  const workflowNameFilterOptions: FilterOption[] = useMemo(() => {
    const names = new Set<string>();
    for (const p of fetchWorkflows.data?.data ?? []) {
      if (p.workflowName) names.add(p.workflowName);
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
              const ws = workspaceMap.get(wsId);
              return (
                <Badge
                  variant="outline"
                  className="hover:bg-primary/10 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilters((curr) => ({ ...curr, workspaceId: wsId }));
                  }}
                >
                  {ws?.title ?? wsId.slice(0, 8)}
                </Badge>
              );
            },
          },
          {
            id: 'appName',
            label: 'App',
            minWidth: 100,
            format: (_value: unknown, item: unknown) => {
              const wsId = (item as Record<string, unknown>).workspaceId as string;
              const ws = workspaceMap.get(wsId);
              if (!ws) return '—';
              return ws.appName;
            },
          },
          {
            id: 'workflowName',
            label: 'Workflow',
            minWidth: 100,
            format: (value: unknown) => {
              const name = value as string;
              return (
                <Badge
                  variant="outline"
                  className="hover:bg-primary/10 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilters((curr) => ({ ...curr, workflowName: name }));
                  }}
                >
                  {name}
                </Badge>
              );
            },
          },
          {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            format: (value: unknown, row?: unknown) => {
              const status = value as string;
              const color = getWorkflowStateColor(status as WorkflowState);
              // A waiting run with nothing running under it has nobody left to wait for but you.
              const waitingOnYou = row ? needsInput(row as WorkflowItemInterface) : false;
              return (
                <div className="flex items-center gap-1.5">
                  <Badge className={`rounded-full border px-2 py-1 text-xs whitespace-nowrap ${color}`}>{status}</Badge>
                  {waitingOnYou && <Badge className="px-2 py-1">Needs input</Badge>}
                </div>
              );
            },
          },
          {
            id: 'createdAt',
            label: 'Date Created',
            minWidth: 100,
            format: (value: unknown) => new Date(value as string).toLocaleString(),
          },
        ] as Column[]
      }
      filterConfig={{
        // "All runs" clears it, and clearing it is what includes every sub-execution at any depth.
        runs: [{ label: 'Top-level only', value: 'top' }],
        // `paused` is not offered: the engine never assigns it — a run that parks is `waiting`.
        status: ['pending', 'running', 'waiting', 'completed', 'failed', 'canceled'],
        workspaceId: workspaceFilterOptions,
        workflowName: workflowNameFilterOptions,
      }}
    />
  );
};

export default Runs;
