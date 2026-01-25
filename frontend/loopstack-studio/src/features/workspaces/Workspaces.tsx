import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { WorkspaceItemDto } from '@loopstack/api-client';
import ItemListView from '../../components/lists/ListView.tsx';
import type { Column } from '../../components/lists/ListView.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Dialog, DialogContent } from '../../components/ui/dialog.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip.tsx';
import { useWorkspaceConfig } from '../../hooks/useConfig.ts';
import { useDebounce } from '../../hooks/useDebounce.ts';
import { useBatchDeleteWorkspaces, useDeleteWorkspace, useFilterWorkspaces } from '../../hooks/useWorkspaces.ts';
import { useStudio } from '../../providers/StudioProvider.tsx';
import CreateWorkspace from './components/CreateWorkspace.tsx';

const Workspaces = () => {
  const { router } = useStudio();

  const [searchParams] = useSearchParams();

  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState<string | undefined>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState<WorkspaceItemDto | undefined>(undefined);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setOpen(true);
    }
  }, [searchParams]);

  const fetchWorkspaceTypes = useWorkspaceConfig();

  const fetchWorkspaces = useFilterWorkspaces(debouncedSearchTerm, filters, orderBy, order, page, rowsPerPage);

  const deletePipeline = useDeleteWorkspace();
  const batchDeletePipelines = useBatchDeleteWorkspaces();

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

  const handleWorkspaceClick = (id: string) => {
    void router.navigateToWorkspace(id);
  };

  const handleEdit = (pipeline: WorkspaceItemDto) => {
    setOpenEdit(pipeline);
  };

  const handleEditClose = () => {
    setOpen(false);
    setOpenEdit(undefined);
  };

  return (
    <>
      <ItemListView
        loading={fetchWorkspaceTypes.isPending || fetchWorkspaces.isPending}
        error={fetchWorkspaces.error ?? fetchWorkspaceTypes.error ?? null}
        items={fetchWorkspaces.data?.data ?? []}
        totalItems={fetchWorkspaces.data?.total ?? 0}
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
        onClick={handleWorkspaceClick}
        handleNew={handleOpen}
        handleEdit={handleEdit}
        enableBatchActions={true}
        batchDelete={handleBatchDelete}
        columns={
          [
            { id: 'id', label: 'ID', minWidth: 30, format: (value: string) => value.slice(0, 6) },
            {
              id: 'title',
              label: 'Title',
              minWidth: 100,
              format: (value: string) => (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="hover:bg-primary/10 cursor-pointer"
                        onClick={() => setFilters((curr) => ({ ...curr, blockName: value }))}
                      >
                        {value.length > 25 ? value.slice(0, 25) + '...' : value}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{value}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ),
            },
            // {
            //   id: 'type',
            //   label: 'Type',
            //   minWidth: 100,
            //   format: (value: string) => (
            //     <Badge
            //       variant="outline"
            //       className="cursor-pointer"
            //       onClick={() => setFilters((curr) => ({ ...curr, type: value }))}>
            //       {value}
            //     </Badge>
            //   )
            // },
            {
              id: 'createdAt',
              label: 'Date Created',
              minWidth: 100,
              format: (value: string) => new Date(value).toLocaleDateString(),
            },
            // {
            //   id: 'updatedAt',
            //   label: 'Updated Date',
            //   minWidth: 100,
            //   format: (value) => new Date(value).toLocaleDateString()
            // }
          ] as Column[]
        }
        filterConfig={{}}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <CreateWorkspace types={fetchWorkspaceTypes.data ?? []} onSuccess={handleClose} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!openEdit} onOpenChange={(open) => !open && handleEditClose()}>
        <DialogContent className="max-w-2xl">
          <CreateWorkspace types={fetchWorkspaceTypes.data ?? []} workspace={openEdit} onSuccess={handleEditClose} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Workspaces;
