import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@loopstack/client';
import type {
  RunWorkflowPayloadInterface,
  StartWorkflowPayloadInterface,
  WorkflowCreateInterface,
  WorkflowUpdateInterface,
} from '@loopstack/contracts/api';
import { useLoopstackClient } from '../provider.js';

/** Start a new workflow run by name. Stales every workflow list of the environment. */
export function useStartWorkflow() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StartWorkflowPayloadInterface) => client.processor.start(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workflows(client.envKey) });
    },
  });
}

/**
 * Run a workflow from its current place. Pass a `transition` in the payload
 * to answer a waiting transition (e.g. a HITL prompt).
 */
export function useRunWorkflow() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, payload }: { workflowId: string; payload?: RunWorkflowPayloadInterface }) =>
      client.processor.run(workflowId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workflows(client.envKey) });
    },
  });
}

/** Create a new workflow. */
export function useCreateWorkflow() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WorkflowCreateInterface) => client.workflows.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workflows(client.envKey) });
    },
  });
}

/** Update an existing workflow. */
export function useUpdateWorkflow() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkflowUpdateInterface }) =>
      client.workflows.update(id, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workflow(client.envKey, variables.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workflows(client.envKey) });
    },
  });
}

/** Delete a single workflow. Drops its cache entry instead of refetching it. */
export function useDeleteWorkflow() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.workflows.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.workflow(client.envKey, id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workflows(client.envKey) });
    },
  });
}
