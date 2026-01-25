import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApiV1WorkspacesApiWorkspaceControllerCreateWorkspaceRequest,
  ApiV1WorkspacesApiWorkspaceControllerUpdateWorkspaceRequest,
  WorkspaceSortByDto,
} from '@loopstack/api-client';
import { useApiClient } from './useApi.ts';

export function useWorkspace(id: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['workspace', id, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1WorkspacesApi.workspaceControllerGetWorkspaceById({ id: id! });
    },
    enabled: !!id,
    select: (res) => res.data,
  });
}

export function useFilterWorkspaces(
  searchTerm: string | undefined,
  filter: Record<string, string>,
  sortBy: string = 'id',
  order: string = 'desc',
  page: number = 0,
  limit: number = 10,
) {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify(filter),
    sortBy: JSON.stringify([
      {
        field: sortBy,
        order: order,
      } as WorkspaceSortByDto,
    ]),
    page,
    limit,
    search: searchTerm,
    searchColumns: JSON.stringify(['title']),
  };

  return useQuery({
    queryKey: ['workspaces', requestParams, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1WorkspacesApi.workspaceControllerGetWorkspaces(requestParams);
    },
    select: (res) => res.data,
    enabled: true,
  });
}

export function useCreateWorkspace() {
  const { api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceCreateRequest: ApiV1WorkspacesApiWorkspaceControllerCreateWorkspaceRequest) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1WorkspacesApi.workspaceControllerCreateWorkspace(workspaceCreateRequest);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useUpdateWorkspace() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceUpdateRequest: ApiV1WorkspacesApiWorkspaceControllerUpdateWorkspaceRequest) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1WorkspacesApi.workspaceControllerUpdateWorkspace(workspaceUpdateRequest);
    },
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
    mutationFn: (id: string) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1WorkspacesApi.workspaceControllerDeleteWorkspace({ id });
    },
    onSuccess: (_, id) => {
      // Remove the workspace from the cache and invalidate the workspaces list
      queryClient.removeQueries({ queryKey: ['workspace', id, envKey] });
      void queryClient.invalidateQueries({ queryKey: ['workspaces', envKey] });
    },
  });
}

export function useBatchDeleteWorkspaces() {
  const { api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1WorkspacesApi.workspaceControllerBatchDeleteWorkspaces({
        workspaceControllerBatchDeleteWorkspacesRequest: { ids },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
