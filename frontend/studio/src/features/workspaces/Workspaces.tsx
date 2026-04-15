import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { WorkspaceItemInterface } from '@loopstack/contracts/api';
import ItemListView from '../../components/lists/ListView.tsx';
import type { Column, OriginalRowAction } from '../../components/lists/ListView.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Dialog, DialogContent } from '../../components/ui/dialog.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip.tsx';
import { useWorkspaceConfig } from '../../hooks/useConfig.ts';
import { useDebounce } from '../../hooks/useDebounce.ts';
import {
  useBatchDeleteWorkspaces,
  useDeleteWorkspace,
  useFilterWorkspaces,
  useSetFavouriteWorkspace,
} from '../../hooks/useWorkspaces.ts';
import { useComponentOverrides } from '../../providers/ComponentOverridesProvider.tsx';
import { useStudio } from '../../providers/StudioProvider.tsx';
import DefaultCreateWorkspace from './components/CreateWorkspace.tsx';

const Workspaces = () => {
  const { CreateWorkspace: CreateWorkspaceOverride, EditWorkspace: EditWorkspaceOverride } = useComponentOverrides();
  const CreateWorkspace = CreateWorkspaceOverride ?? DefaultCreateWorkspace;
  const EditWorkspace = EditWorkspaceOverride ?? DefaultCreateWorkspace;
  const { router } = useStudio();

  const [searchParams] = useSearchParams();

  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [searchTerm, setSearchTerm] = useState<string | undefined>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState<WorkspaceItemInterface | undefined>(undefined);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setOpen(true);
    }
  }, [searchParams]);

  const fetchWorkspaceTypes = useWorkspaceConfig();

  const fetchWorkspaces = useFilterWorkspaces(debouncedSearchTerm, filters, orderBy, order, page, rowsPerPage);

  const deleteWorkspace = useDeleteWorkspace();
  const batchDeleteWorkspaces = useBatchDeleteWorkspaces();
  const setFavourite = useSetFavouriteWorkspace();

  const handleDelete = (id: string) => {
    deleteWorkspace.mutate(id);
  };

  const handleBatchDelete = (ids: string[]) => {
    batchDeleteWorkspaces.mutate(ids);
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

  const handleEdit = (workspace: WorkspaceItemInterface) => {
    setOpenEdit(workspace);
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
                        onClick={() => setFilters((curr) => ({ ...curr, className: value }))}
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
              id: 'environments',
              label: 'Environments',
              minWidth: 150,
              format: (value: unknown) => {
                const envs = value as
                  | Array<{ remoteEnvironmentId: string; envName?: string; type?: string }>
                  | undefined;
                if (!envs || envs.length === 0) return '—';
                return (
                  <div className="flex flex-wrap gap-1">
                    {envs.map((env) => (
                      <Badge key={env.remoteEnvironmentId} variant="secondary">
                        {env.envName ?? env.remoteEnvironmentId.slice(0, 8)}
                        {env.type && <span className="text-muted-foreground ml-1">({env.type})</span>}
                      </Badge>
                    ))}
                  </div>
                );
              },
            },
            {
              id: 'createdAt',
              label: 'Date Created',
              minWidth: 100,
              format: (value: string) => new Date(value).toLocaleString(),
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
        rowActions={
          [
            {
              id: 'add-favourite',
              label: 'Add to favourites',
              icon: <Star className="h-4 w-4" />,
              condition: (item: WorkspaceItemInterface) => !item.isFavourite,
              action: (item: WorkspaceItemInterface) => {
                setFavourite.mutate({ id: item.id, isFavourite: true });
              },
            },
            {
              id: 'remove-favourite',
              label: 'Remove from favourites',
              icon: <Star className="h-4 w-4 fill-current" />,
              condition: (item: WorkspaceItemInterface) => !!item.isFavourite,
              action: (item: WorkspaceItemInterface) => {
                setFavourite.mutate({ id: item.id, isFavourite: false });
              },
            },
          ] as OriginalRowAction<WorkspaceItemInterface>[]
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <CreateWorkspace types={fetchWorkspaceTypes.data ?? []} onSuccess={handleClose} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!openEdit} onOpenChange={(open) => !open && handleEditClose()}>
        <DialogContent className="max-w-2xl">
          {openEdit && (
            <EditWorkspace types={fetchWorkspaceTypes.data ?? []} workspace={openEdit} onSuccess={handleEditClose} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Workspaces;
