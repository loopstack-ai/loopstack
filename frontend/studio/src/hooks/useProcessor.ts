import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RunWorkflowPayloadInterface } from '@loopstack/contracts/api';
import type { WorkflowPayload } from '@/api/types';
import { getWorkflowsCacheKey } from './query-keys.ts';
import { useApiClient } from './useApi.ts';

export function useRunWorkflow() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workflowId: string; runWorkflowPayloadDto: RunWorkflowPayloadInterface; force?: boolean }) =>
      api.processor.runWorkflow(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getWorkflowsCacheKey(envKey) });
    },
  });
}

export function useExecuteController() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { path: string; payload: WorkflowPayload }) => api.processor.executeController(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getWorkflowsCacheKey(envKey) });
    },
  });
}
