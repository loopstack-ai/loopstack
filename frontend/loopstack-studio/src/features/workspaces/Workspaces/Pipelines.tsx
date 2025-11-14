import React, { useState } from 'react';
import { Badge } from '../../../components/ui/badge.tsx';
import { Dialog, DialogContent } from '../../../components/ui/dialog.tsx';
import ItemListView from '../../../components/lists/ListView.tsx';
import type { Column } from '../../../components/lists/ListView.tsx';
import { useDebounce } from '../../../hooks/useDebounce.ts';
import {
  useBatchDeletePipeline,
  useDeletePipeline,
  useFilterPipelines
} from '../../../hooks/usePipelines.ts';
import type {
  PipelineConfigDto,
  PipelineDto,
  PipelineItemDto,
  WorkspaceDto
} from '@loopstack/api-client';
import { PipelineStatus } from '@loopstack/api-client';
import { usePipelineConfig } from '../../../hooks/useConfig.ts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../../../components/ui/tooltip.tsx';
import CreatePipeline from './CreatePipeline.tsx';
import { useStudio } from '../../../providers/StudioProvider.tsx';

interface PipelinesProps {
  workspace: WorkspaceDto;
}

const Pipelines: React.FC<PipelinesProps> = ({ workspace }) => {
  const { router } = useStudio();

  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState<string | undefined>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState<PipelineItemDto | undefined>(undefined);

  const fetchPipelineTypes = usePipelineConfig(workspace.configKey);

  const fetchPipelines = useFilterPipelines(
    debouncedSearchTerm,
    {
      ...filters,
      workspaceId: workspace.id
    },
    orderBy,
    order,
    page,
    rowsPerPage
  );

  const deletePipeline = useDeletePipeline();
  const batchDeletePipelines = useBatchDeletePipeline();

  const handleDelete = (id: string) => {
    deletePipeline.mutate(id);
  };

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

  const handleEdit = (pipeline: PipelineDto) => {
    setOpenEdit(pipeline);
  };

  const handleEditClose = () => {
    setOpen(false);
    setOpenEdit(undefined);
  };

  return (
    <div className="pt-2">
      <ItemListView
        title={''}
        loading={fetchPipelines.isPending}
        error={fetchPipelines.error ?? null}
        items={fetchPipelines.data?.data ?? []}
        totalItems={fetchPipelines.data?.total ?? 0}
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
        onClick={handlePipelineClick}
        handleNew={handleOpen}
        handleEdit={handleEdit}
        enableBatchActions={true}
        batchDelete={handleBatchDelete}
        columns={
          [
            { id: 'id', label: 'ID', minWidth: 30, format: (value: string) => value.slice(0, 6) },
            { id: 'title', label: 'Title', minWidth: 100 },
            {
              id: 'configKey',
              label: 'Automation',
              minWidth: 100,
              format: (value: string) => (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => setFilters((curr) => ({ ...curr, configKey: value }))}
                      >
                        {value.length > 25 ? value.slice(0, 25) + '...' : value}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{value}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            },
            {
              id: 'labels',
              label: 'Labels',
              minWidth: 200,
              format: (labels: string[]) =>
                labels.map((label, index) => (
                  <Badge key={index} variant="outline" className="mr-1">
                    {label}
                  </Badge>
                ))
            },
            {
              id: 'status',
              label: 'Status',
              minWidth: 100,
              format: (value: string) => (
                <Badge
                  variant="default"
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => setFilters((curr) => ({ ...curr, status: value }))}
                >
                  {value}
                </Badge>
              )
            },
            {
              id: 'createdAt',
              label: 'Created Date',
              minWidth: 100,
              format: (value: string) => new Date(value).toLocaleDateString()
            },
            {
              id: 'updatedAt',
              label: 'Updated Date',
              minWidth: 100,
              format: (value: string) => new Date(value).toLocaleDateString()
            }
          ] as Column[]
        }
        filterConfig={{
          configKey:
            fetchPipelineTypes.data?.map((item: PipelineConfigDto) => item.configKey) ?? [],
          status: Object.values(PipelineStatus)
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <CreatePipeline workspace={workspace} onSuccess={handleClose} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!openEdit} onOpenChange={(open) => !open && handleEditClose()}>
        <DialogContent className="max-w-2xl">
          {openEdit && (
            <CreatePipeline workspace={workspace} pipeline={openEdit} onSuccess={handleEditClose} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pipelines;
