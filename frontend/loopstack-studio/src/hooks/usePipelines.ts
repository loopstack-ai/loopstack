import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import type {
  ApiV1PipelinesApiPipelineControllerCreatePipelineRequest,
  ApiV1PipelinesApiPipelineControllerUpdatePipelineRequest,
  PipelineConfigDto,
  PipelineSortByDto,
} from '@loopstack/api-client';
import { useApiClient } from './useApi';

export function usePipeline(id: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['pipeline', id, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1PipelinesApi.pipelineControllerGetPipelineById({ id: id! });
    },
    enabled: !!id,
    select: (res) => res.data,
  });
}

export function useFilterPipelines(
  searchTerm: string | undefined,
  filter: Record<string, string | null>,
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
      } as PipelineSortByDto,
    ]),
    page,
    limit,
    search: searchTerm,
    searchColumns: JSON.stringify(['title', 'model']),
  };

  return useQuery({
    queryKey: ['pipelines', requestParams, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1PipelinesApi.pipelineControllerGetPipelines(requestParams);
    },
    select: (res) => res.data,
    enabled: true,
  });
}

export function useCreatePipeline() {
  const { envKey, api } = useApiClient();

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pipelineCreateRequest: ApiV1PipelinesApiPipelineControllerCreatePipelineRequest) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1PipelinesApi.pipelineControllerCreatePipeline(pipelineCreateRequest);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pipelines', envKey] });
    },
  });
}

export function useUpdatePipeline() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pipelineUpdateRequest: ApiV1PipelinesApiPipelineControllerUpdatePipelineRequest) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1PipelinesApi.pipelineControllerUpdatePipeline(pipelineUpdateRequest);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['pipeline', variables.id, envKey] });
      void queryClient.invalidateQueries({ queryKey: ['pipelines', envKey] });
    },
  });
}

export function usePipelineConfig(workspaceBlockName: string | undefined, pipelineBlockName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery<AxiosResponse<PipelineConfigDto>, Error, PipelineConfigDto>({
    queryKey: ['pipelineConfig', workspaceBlockName, pipelineBlockName, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1ConfigApi.configControllerGetPipelineConfigByName({
        workspaceBlockName: workspaceBlockName!,
        pipelineName: pipelineBlockName!,
      });
    },
    enabled: !!workspaceBlockName && !!pipelineBlockName,
    select: (res) => res.data,
  });
}

export function useDeletePipeline() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1PipelinesApi.pipelineControllerDeletePipeline({ id });
    },
    onSuccess: (_, id) => {
      // Remove the pipeline from the cache and invalidate the pipelines list
      queryClient.removeQueries({ queryKey: ['pipeline', id, envKey] });
      void queryClient.invalidateQueries({ queryKey: ['pipelines', envKey] });
    },
  });
}

export function useBatchDeletePipeline() {
  const { api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1PipelinesApi.pipelineControllerBatchDeletePipelines({
        pipelineControllerBatchDeletePipelinesRequest: { ids },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pipelines'], type: 'all' });
    },
  });
}
