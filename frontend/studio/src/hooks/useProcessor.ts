import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RunPipelinePayloadInterface } from '@loopstack/contracts/api';
import { useApiClient } from './useApi.ts';

export function useRunPipeline() {
  const { api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { pipelineId: string; runPipelinePayloadDto: RunPipelinePayloadInterface; force?: boolean }) =>
      api.processor.runPipeline(params),
    onSuccess: () => {
      console.log('success');
      void queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });
}
