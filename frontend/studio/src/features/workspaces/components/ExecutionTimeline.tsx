import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { WorkflowItemInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import CustomListView from '../../../components/lists/CustomListView.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { useBatchDeleteWorkflows, useChildWorkflows, useFilterWorkflows } from '../../../hooks/useWorkflows.ts';
import { useStudio } from '../../../providers/StudioProvider.tsx';
import CreateWorkflowDialog from './NewWorkflowRunDialog.tsx';

const ChildWorkflowList: React.FC<{
  parentId: string;
  formatUpdatedTime: (updatedAt: string) => string;
  getWorkflowStateColor: (status: WorkflowState) => string;
  onChildClick: (id: string) => void;
}> = ({ parentId, formatUpdatedTime, getWorkflowStateColor, onChildClick }) => {
  const { data, isPending } = useChildWorkflows(parentId, true);

  if (isPending) {
    return (
      <div className="flex items-center py-2 pl-8">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const children = data ?? [];

  if (children.length === 0) {
    return <p className="py-1 pl-8 text-xs text-gray-400">No child workflows</p>;
  }

  return (
    <div className="mt-4 border-t pt-3 pl-8">
      {children.map((child) => (
        <div
          key={child.id}
          className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded px-2 py-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onChildClick(child.id);
          }}
        >
          <div>
            <p className="text-sm font-medium">
              Run #{child.run} {child.title ? `(${child.title})` : ''}
            </p>
            <p className="text-xs text-gray-500">{child.alias}</p>
            <p className="text-xs text-gray-400">{formatUpdatedTime(child.updatedAt)}</p>
          </div>
          <Badge variant="default" className={getWorkflowStateColor(child.status)}>
            {child.status}
          </Badge>
        </div>
      ))}
    </div>
  );
};

interface ExecutionTimelineProps {
  workspace: WorkspaceInterface;
}

const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ workspace }) => {
  const { router } = useStudio();
  const queryClient = useQueryClient();

  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['workflows'] });
  }, [queryClient]);

  // Format updated time to show relative time for recent updates using date-fns
  const formatUpdatedTime = (updatedAt: string) => {
    const updatedDate = parseISO(updatedAt);

    if (isToday(updatedDate)) {
      return formatDistanceToNow(updatedDate, { addSuffix: true });
    } else if (isYesterday(updatedDate)) {
      return `Yesterday at ${format(updatedDate, 'h:mm a')}`;
    } else {
      return format(updatedDate, 'MMM d, yyyy h:mm a');
    }
  };

  // Fetch workflows with pagination
  const fetchWorkflows = useFilterWorkflows(
    undefined,
    { workspaceId: workspace.id, parentId: null },
    'createdAt',
    'DESC',
    page,
    rowsPerPage,
  );

  const batchDeleteWorkflows = useBatchDeleteWorkflows();
  const handleBatchDelete = (ids: string[]) => {
    batchDeleteWorkflows.mutate(ids);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleWorkflowClick = (id: string) => {
    void router.navigateToWorkflow(id);
  };

  const getWorkflowStateColor = (status: WorkflowState): string => {
    switch (status) {
      case WorkflowState.Completed:
        return 'bg-green-600';
      case WorkflowState.Paused:
        return 'bg-yellow-600';
      case WorkflowState.Failed:
        return 'bg-red-600';
      case WorkflowState.Canceled:
      case WorkflowState.Pending:
      case WorkflowState.Running:
      default:
        return 'bg-black';
    }
  };

  const workflows = fetchWorkflows.data?.data ?? [];
  const totalItems = fetchWorkflows.data?.total ?? 0;

  const renderItem = (item: WorkflowItemInterface) => (
    <div>
      <div className="flex items-center justify-between space-x-3">
        <div>
          <h3 className="hover:text-primary font-medium transition-colors">
            Run #{item.run} {item.title ? `(${item.title})` : ''}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{item.alias}</p>
          {item.hasChildren > 0 && (
            <button
              onClick={(e) => toggleExpand(item.id, e)}
              className="hover:bg-muted mt-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-400"
            >
              {expandedIds.has(item.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {item.hasChildren} sub {item.hasChildren === 1 ? 'execution' : 'executions'}
            </button>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="default" className={getWorkflowStateColor(item.status)}>
            {item.status}
          </Badge>
          <span className="text-xs text-gray-400">{formatUpdatedTime(item.updatedAt)}</span>
        </div>
      </div>
      {item.hasChildren > 0 && expandedIds.has(item.id) && (
        <ChildWorkflowList
          parentId={item.id}
          formatUpdatedTime={formatUpdatedTime}
          getWorkflowStateColor={getWorkflowStateColor}
          onChildClick={handleWorkflowClick}
        />
      )}
    </div>
  );

  return (
    <div>
      <ErrorSnackbar error={fetchWorkflows.error} />

      {fetchWorkflows.isPending ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        ''
      )}

      <CustomListView
        loading={fetchWorkflows.isPending}
        error={fetchWorkflows.error ?? null}
        items={workflows}
        totalItems={totalItems}
        onClick={handleWorkflowClick}
        handleNew={handleOpen}
        setPage={setPage}
        setRowsPerPage={setRowsPerPage}
        page={page}
        rowsPerPage={rowsPerPage}
        enableBatchActions={true}
        batchDelete={handleBatchDelete}
        itemRenderer={renderItem}
        newButtonLabel="Run"
      />

      <CreateWorkflowDialog isOpen={open} onOpenChange={setOpen} workspace={workspace} onSuccess={handleClose} />
    </div>
  );
};

export default ExecutionTimeline;
