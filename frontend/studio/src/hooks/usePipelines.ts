import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  PipelineConfigInterface,
  PipelineCreateInterface,
  PipelineSortByInterface,
  PipelineSourceInterface,
  PipelineUpdateInterface,
} from '@loopstack/contracts/api';
import { useApiClient } from './useApi';

export function usePipeline(id: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['pipeline', id, envKey],
    queryFn: () => api.pipelines.getById({ id: id! }),
    enabled: !!id,
  });
}

export function useFilterPipelines(
  searchTerm: string | undefined,
  filter: Record<string, string | null>,
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
      } as PipelineSortByInterface,
    ]),
    page,
    limit,
    ...(searchTerm && { search: searchTerm, searchColumns: JSON.stringify(['title', 'model']) }),
  };

  return useQuery({
    queryKey: ['pipelines', requestParams, envKey],
    queryFn: () => api.pipelines.getAll(requestParams),
    enabled: true,
  });
}

export function useCreatePipeline() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { pipelineCreateDto: PipelineCreateInterface }) => api.pipelines.create(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pipelines', envKey] });
    },
  });
}

export function useUpdatePipeline() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; pipelineUpdateDto: PipelineUpdateInterface }) => api.pipelines.update(params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['pipeline', variables.id, envKey] });
      void queryClient.invalidateQueries({ queryKey: ['pipelines', envKey] });
    },
  });
}

export function usePipelineConfig(workspaceBlockName: string | undefined, pipelineBlockName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery<PipelineConfigInterface>({
    queryKey: ['pipelineConfig', workspaceBlockName, pipelineBlockName, envKey],
    queryFn: () =>
      api.config.getPipelineConfigByName({
        workspaceBlockName: workspaceBlockName!,
        pipelineName: pipelineBlockName!,
      }),
    enabled: !!workspaceBlockName && !!pipelineBlockName,
  });
}

export function useDeletePipeline() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.pipelines.delete({ id }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['pipeline', id, envKey] });
      void queryClient.invalidateQueries({ queryKey: ['pipelines', envKey] });
    },
  });
}

export function useBatchDeletePipeline() {
  const { api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.pipelines.batchDelete({ ids }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pipelines'], type: 'all' });
    },
  });
}

export function useChildPipelines(parentId: string | undefined, enabled: boolean) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['pipelines', 'children', parentId, envKey],
    queryFn: () =>
      api.pipelines.getAll({
        filter: JSON.stringify({ parentId }),
        sortBy: JSON.stringify([{ field: 'createdAt', order: 'ASC' } as PipelineSortByInterface]),
        page: 0,
        limit: 100,
      }),
    enabled: enabled && !!parentId,
  });
}

export function usePipelineSource(workspaceBlockName: string | undefined, pipelineBlockName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery<PipelineSourceInterface>({
    queryKey: ['pipelineSource', workspaceBlockName, pipelineBlockName, envKey],
    queryFn: () =>
      api.config.getPipelineSourceByName({
        workspaceBlockName: workspaceBlockName!,
        pipelineName: pipelineBlockName!,
      }),
    enabled: !!workspaceBlockName && !!pipelineBlockName,
  });
}
