import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { PipelineItemDto, PipelineStatus, WorkspaceDto } from '@loopstack/api-client';
import CustomListView from '../../../components/lists/CustomListView.tsx';
import ErrorSnackbar from '../../../components/snackbars/ErrorSnackbar.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { useBatchDeletePipeline, useFilterPipelines } from '../../../hooks/usePipelines.ts';
import { useStudio } from '../../../providers/StudioProvider.tsx';
import CreatePipelineDialog from './NewPipelineRunDialog.tsx';

interface PipelinesProps {
  workspace: WorkspaceDto;
}

const ExecutionTimeline: React.FC<PipelinesProps> = ({ workspace }) => {
  const { router } = useStudio();
  const queryClient = useQueryClient();

  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['pipelines'] });
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
    { workspaceId: workspace.id }, // only workspace filter
    'createdAt', // default ordering
    'desc', // newest first
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
    router.navigateToPipeline(id);
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
    <div className="flex items-center justify-between space-x-3">
      <div>
        <h3 className="hover:text-primary font-medium transition-colors">
          Run #{item.run} {item.title ? `(${item.title})` : ''}
        </h3>
        <p className="mt-1 text-sm text-gray-500">{item.blockName}</p>
        <p className="mt-2 text-xs text-gray-400">{formatUpdatedTime(item.updatedAt)}</p>
      </div>
      <Badge variant="default" className={getPipelineStatusColor(item.status)}>
        {item.status}
      </Badge>
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
