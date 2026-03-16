import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  WorkspaceCreateInterface,
  WorkspaceSortByInterface,
  WorkspaceUpdateInterface,
} from '@loopstack/contracts/api';
import { getWorkspaceCacheKey, getWorkspacesCacheKey } from './query-keys.ts';
import { useApiClient } from './useApi.ts';

export function useWorkspace(id: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getWorkspaceCacheKey(envKey, id!),
    queryFn: () => api.workspaces.getById({ id: id! }),
    enabled: !!id,
  });
}

export function useFilterWorkspaces(
  searchTerm: string | undefined,
  filter: Record<string, string>,
  sortBy: string = 'id',
  order: string = 'DESC',
  page: number = 0,
  limit: number = 10,
) {
  const { envKey, api } = useApiClient();

  const hasFilter = Object.keys(filter).length > 0;
  const filterStr = hasFilter ? JSON.stringify(filter) : undefined;

  const requestParams = {
    ...(filterStr && { filter: filterStr }),
    sortBy: JSON.stringify([
      {
        field: sortBy,
        order: order,
      } as WorkspaceSortByInterface,
    ]),
    page,
    limit,
    ...(searchTerm && { search: searchTerm, searchColumns: JSON.stringify(['title']) }),
  };

  return useQuery({
    queryKey: [...getWorkspacesCacheKey(envKey), 'list', searchTerm ?? '', filterStr ?? '', sortBy, order, page, limit],
    queryFn: () => api.workspaces.getAll(requestParams),
  });
}

export function useCreateWorkspace() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceCreateDto: WorkspaceCreateInterface }) => api.workspaces.create(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getWorkspacesCacheKey(envKey) });
    },
  });
}

export function useUpdateWorkspace() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; workspaceUpdateDto: WorkspaceUpdateInterface }) => api.workspaces.update(params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: getWorkspaceCacheKey(envKey, variables.id) });
      void queryClient.invalidateQueries({ queryKey: getWorkspacesCacheKey(envKey) });
    },
  });
}

export function useDeleteWorkspace() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.workspaces.delete({ id }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: getWorkspaceCacheKey(envKey, id) });
      void queryClient.invalidateQueries({ queryKey: getWorkspacesCacheKey(envKey) });
    },
  });
}

export function useSetFavouriteWorkspace() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavourite }: { id: string; isFavourite: boolean }) =>
      api.workspaces.setFavourite({
        id,
        workspaceFavouriteDto: { isFavourite },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getWorkspacesCacheKey(envKey) });
    },
  });
}

export function useBatchDeleteWorkspaces() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.workspaces.batchDelete({ ids }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getWorkspacesCacheKey(envKey) });
    },
  });
}
