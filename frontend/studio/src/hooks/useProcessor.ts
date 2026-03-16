import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RunPipelinePayloadInterface } from '@loopstack/contracts/api';
import { getPipelinesCacheKey } from './query-keys.ts';
import { useApiClient } from './useApi.ts';

export function useRunPipeline() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { pipelineId: string; runPipelinePayloadDto: RunPipelinePayloadInterface; force?: boolean }) =>
      api.processor.runPipeline(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getPipelinesCacheKey(envKey) });
    },
  });
}
