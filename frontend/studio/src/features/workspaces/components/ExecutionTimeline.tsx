import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { PipelineItemDto, PipelineStatus, WorkspaceDto } from '@loopstack/api-client';
import CustomListView from '../../../components/lists/CustomListView.tsx';
import ErrorSnackbar from '../../../components/snackbars/ErrorSnackbar.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { useBatchDeletePipeline, useChildPipelines, useFilterPipelines } from '../../../hooks/usePipelines.ts';
import { useStudio } from '../../../providers/StudioProvider.tsx';
import CreatePipelineDialog from './NewPipelineRunDialog.tsx';

const ChildPipelineList: React.FC<{
  parentId: string;
  formatUpdatedTime: (updatedAt: string) => string;
  getPipelineStatusColor: (status: PipelineStatus) => string;
  onChildClick: (id: string) => void;
}> = ({ parentId, formatUpdatedTime, getPipelineStatusColor, onChildClick }) => {
  const { data, isPending } = useChildPipelines(parentId, true);

  if (isPending) {
    return (
      <div className="flex items-center py-2 pl-8">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const children = data?.data ?? [];

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
            <p className="text-xs text-gray-500">{child.blockName}</p>
            <p className="text-xs text-gray-400">{formatUpdatedTime(child.updatedAt)}</p>
          </div>
          <Badge variant="default" className={getPipelineStatusColor(child.status)}>
            {child.status}
          </Badge>
        </div>
      ))}
    </div>
  );
};

interface PipelinesProps {
  workspace: WorkspaceDto;
}

const ExecutionTimeline: React.FC<PipelinesProps> = ({ workspace }) => {
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
    void queryClient.invalidateQueries({ queryKey: ['pipelines'] });
  }, [queryClient]);

  // Format updated time to show relative time for recent updates using date-fns
  const formatUpdatedTime = (updatedAt: string) => {
    const updatedDate = parseISO(updatedAt);

    if (isToday(updatedDate)) {
      // For today, show relative time (e.g., "2 hours ago", "30 minutes ago")
      return formatDistanceToNow(updatedDate, { addSuffix: true });
    } else if (isYesterday(updatedDate)) {
      // For yesterday, show "Yesterday at 2:30 PM"
      return `Yesterday at ${format(updatedDate, 'h:mm a')}`;
    } else {
      // For older dates, show date with time
      return format(updatedDate, 'MMM d, yyyy h:mm a');
    }
  };

  // Fetch pipelines with pagination
  const fetchPipelines = useFilterPipelines(
    undefined, // no search
    { workspaceId: workspace.id, parentId: null }, // only workspace filter
    'createdAt', // default ordering
    'DESC', // newest first
    page,
    rowsPerPage,
  );

  // const deletePipeline = useDeletePipeline();
  // const handleDelete = (id: string) => {
  //   console.log(id);
  //   deletePipeline.mutate(id);
  // };

  const batchDeletePipelines = useBatchDeletePipeline();
  const handleBatchDelete = (ids: string[]) => {
    batchDeletePipelines.mutate(ids);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handlePipelineClick = (id: string) => {
    void router.navigateToPipeline(id);
  };

  const getPipelineStatusColor = (status: PipelineStatus): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'paused':
        return 'bg-yellow-600';
      case 'failed':
        return 'bg-red-600';
      case 'canceled':
      case 'pending':
      case 'running':
        return 'bg-black';
    }
  };

  const pipelines = fetchPipelines.data?.data ?? [];
  const totalItems = fetchPipelines.data?.total ?? 0;

  const renderItem = (item: PipelineItemDto) => (
    <div>
      <div className="flex items-center justify-between space-x-3">
        <div>
          <h3 className="hover:text-primary font-medium transition-colors">
            Run #{item.run} {item.title ? `(${item.title})` : ''}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{item.blockName}</p>
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
          <Badge variant="default" className={getPipelineStatusColor(item.status)}>
            {item.status}
          </Badge>
          <span className="text-xs text-gray-400">{formatUpdatedTime(item.updatedAt)}</span>
        </div>
      </div>
      {item.hasChildren > 0 && expandedIds.has(item.id) && (
        <ChildPipelineList
          parentId={item.id}
          formatUpdatedTime={formatUpdatedTime}
          getPipelineStatusColor={getPipelineStatusColor}
          onChildClick={handlePipelineClick}
        />
      )}
    </div>
  );

  return (
    <div>
      <ErrorSnackbar error={fetchPipelines.error} />

      {fetchPipelines.isPending ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        ''
      )}

      <CustomListView
        loading={fetchPipelines.isPending}
        error={fetchPipelines.error ?? null}
        items={pipelines}
        totalItems={totalItems}
        onClick={handlePipelineClick}
        handleNew={handleOpen}
        setPage={setPage}
        setRowsPerPage={setRowsPerPage}
        page={page}
        rowsPerPage={rowsPerPage}
        enableBatchActions={true}
        batchDelete={handleBatchDelete}
        itemRenderer={renderItem}
        // rowActions={[
        //   {
        //     id: 'delete',
        //     label: 'Delete',
        //     icon: <Trash2 className="h-4 w-4" />,
        //     variant: 'ghost' as const,
        //     action: (item: PipelineItemDto) => handleDelete(item.id)
        //   }
        // ]}
        newButtonLabel="Run"
      />

      <CreatePipelineDialog isOpen={open} onOpenChange={setOpen} workspace={workspace} onSuccess={handleClose} />
    </div>
  );
};

export default ExecutionTimeline;
