import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  WorkspaceCreateInterface,
  WorkspaceSortByInterface,
  WorkspaceUpdateInterface,
} from '@loopstack/contracts/api';
import { useApiClient } from './useApi.ts';

export function useWorkspace(id: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['workspace', id, envKey],
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

  const requestParams = {
    ...(hasFilter && { filter: JSON.stringify(filter) }),
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
    queryKey: ['workspaces', envKey, requestParams],
    queryFn: () => api.workspaces.getAll(requestParams),
    enabled: true,
  });
}

export function useCreateWorkspace() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceCreateDto: WorkspaceCreateInterface }) => api.workspaces.create(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces', envKey] });
    },
  });
}

export function useUpdateWorkspace() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; workspaceUpdateDto: WorkspaceUpdateInterface }) => api.workspaces.update(params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['workspace', variables.id, envKey] });
      void queryClient.invalidateQueries({ queryKey: ['workspaces', envKey] });
    },
  });
}

export function useDeleteWorkspace() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.workspaces.delete({ id }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['workspace', id, envKey] });
      void queryClient.invalidateQueries({ queryKey: ['workspaces', envKey] });
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
      void queryClient.invalidateQueries({ queryKey: ['workspaces', envKey] });
    },
  });
}

export function useBatchDeleteWorkspaces() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.workspaces.batchDelete({ ids }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces', envKey] });
    },
  });
}
