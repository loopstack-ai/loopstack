import { useQuery } from '@tanstack/react-query';
import { getNamespaceCacheKey, getNamespacesByPipelineCacheKey } from './query-keys.ts';
import { useApiClient } from './useApi.ts';

export function useNamespace(id: string) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getNamespaceCacheKey(envKey, id),
    queryFn: () => api.namespaces.getById({ id }),
    enabled: !!id,
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
    queryFn: () => api.namespaces.getAll(requestParams),
    select: (res) => res.data,
    enabled: !!pipelineId,
  });
}
