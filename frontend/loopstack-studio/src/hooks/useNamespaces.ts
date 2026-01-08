import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './useApi.ts';

export function getNamespaceCacheKey(envKey: string, namespaceId: string) {
  return ['namespace', envKey, namespaceId];
}

export function getNamespacesByPipelineCacheKey(envKey: string, pipelineId: string) {
  return ['namespaces', envKey, pipelineId];
}

export function useNamespace(id: string) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getNamespaceCacheKey(envKey, id),
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1NamespacesApi.namespaceControllerGetWorkflowById({ id });
    },
    enabled: !!id,
    select: (res) => res.data,
  });
}

export function useFilterNamespaces(pipelineId?: string) {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify({
      pipelineId,
    }),
  };

  return useQuery({
    queryKey: getNamespacesByPipelineCacheKey(envKey, pipelineId!),
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1NamespacesApi.namespaceControllerGetWorkflows(requestParams);
    },
    enabled: !!pipelineId,
    select: (res) => res.data.data,
  });
}
