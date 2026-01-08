import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiV1ProcessorApiProcessorControllerRunPipelineRequest } from '@loopstack/api-client';
import { useApiClient } from './useApi.ts';

export function useRunPipeline() {
  const { api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pipelineRunRequest: ApiV1ProcessorApiProcessorControllerRunPipelineRequest) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1ProcessorApi.processorControllerRunPipeline(pipelineRunRequest);
    },
    onSuccess: (_) => {
      console.log('success');
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });
}
