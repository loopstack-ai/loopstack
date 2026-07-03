import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@loopstack/client';
import type {
  RunWorkflowPayloadInterface,
  StartWorkflowPayloadInterface,
  WorkflowCreateInterface,
  WorkflowUpdateInterface,
  WorkspaceCreateInterface,
  WorkspaceUpdateInterface,
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

/** Create a new workspace. Stales every workspace list of the environment. */
export function useCreateWorkspace() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WorkspaceCreateInterface) => client.workspaces.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(client.envKey) });
    },
  });
}

/** Update an existing workspace. */
export function useUpdateWorkspace() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkspaceUpdateInterface }) =>
      client.workspaces.update(id, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace(client.envKey, variables.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(client.envKey) });
    },
  });
}

/** Toggle the favourite flag of a workspace. */
export function useSetFavouriteWorkspace() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavourite }: { id: string; isFavourite: boolean }) =>
      client.workspaces.setFavourite(id, isFavourite),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace(client.envKey, variables.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(client.envKey) });
    },
  });
}

/** Delete a single workspace. Drops its cache entry instead of refetching it. */
export function useDeleteWorkspace() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.workspaces.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.workspace(client.envKey, id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(client.envKey) });
    },
  });
}

/** Delete multiple workspaces in one request. */
export function useBatchDeleteWorkspaces() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => client.workspaces.batchDelete(ids),
    onSuccess: (_, ids) => {
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.workspace(client.envKey, id) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(client.envKey) });
    },
  });
}
