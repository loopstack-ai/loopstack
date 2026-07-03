import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TEST_ENV_KEY, createTestClient, createWrapper } from '../testing/test-utils.js';
import {
  useBatchDeleteWorkspaces,
  useCreateWorkspace,
  useDeleteWorkflow,
  useRunWorkflow,
  useSetFavouriteWorkspace,
  useStartWorkflow,
  useUpdateWorkflow,
} from './mutations.js';

describe('mutation hooks', () => {
  it('useStartWorkflow starts a run and stales the workflow lists', async () => {
    const { client, processor } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useStartWorkflow(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ workflowName: 'hello', workspaceId: 'ws-1' });
    });

    expect(processor.start).toHaveBeenCalledWith({ workflowName: 'hello', workspaceId: 'ws-1' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workflows', TEST_ENV_KEY] });
  });

  it('useRunWorkflow forwards the transition payload', async () => {
    const { client, processor } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRunWorkflow(), { wrapper });
    const payload = { transition: { workflowId: 'wf-1', id: 'tr-1', payload: { answer: 'yes' } } };
    await act(async () => {
      await result.current.mutateAsync({ workflowId: 'wf-1', payload });
    });

    expect(processor.run).toHaveBeenCalledWith('wf-1', payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workflows', TEST_ENV_KEY] });
  });

  it('useUpdateWorkflow stales the workflow and the lists', async () => {
    const { client, workflows } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateWorkflow(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'wf-1', payload: { title: 'Renamed' } });
    });

    expect(workflows.update).toHaveBeenCalledWith('wf-1', { title: 'Renamed' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workflow', TEST_ENV_KEY, 'wf-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workflows', TEST_ENV_KEY] });
  });

  it('useDeleteWorkflow drops the cache entry instead of refetching it', async () => {
    const { client, workflows } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    queryClient.setQueryData(['workflow', TEST_ENV_KEY, 'wf-1'], { id: 'wf-1' });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteWorkflow(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('wf-1');
    });

    expect(workflows.delete).toHaveBeenCalledWith('wf-1');
    expect(queryClient.getQueryData(['workflow', TEST_ENV_KEY, 'wf-1'])).toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workflows', TEST_ENV_KEY] });
  });

  it('useCreateWorkspace stales the workspace lists', async () => {
    const { client, workspaces } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateWorkspace(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ appName: 'hello-app', title: 'My Workspace' });
    });

    expect(workspaces.create).toHaveBeenCalledWith({ appName: 'hello-app', title: 'My Workspace' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workspaces', TEST_ENV_KEY] });
  });

  it('useSetFavouriteWorkspace stales the workspace and the lists', async () => {
    const { client, workspaces } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSetFavouriteWorkspace(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'ws-1', isFavourite: true });
    });

    expect(workspaces.setFavourite).toHaveBeenCalledWith('ws-1', true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workspace', TEST_ENV_KEY, 'ws-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workspaces', TEST_ENV_KEY] });
  });

  it('useBatchDeleteWorkspaces drops every cache entry and stales the lists', async () => {
    const { client, workspaces } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    queryClient.setQueryData(['workspace', TEST_ENV_KEY, 'ws-1'], { id: 'ws-1' });
    queryClient.setQueryData(['workspace', TEST_ENV_KEY, 'ws-2'], { id: 'ws-2' });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBatchDeleteWorkspaces(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(['ws-1', 'ws-2']);
    });

    expect(workspaces.batchDelete).toHaveBeenCalledWith(['ws-1', 'ws-2']);
    expect(queryClient.getQueryData(['workspace', TEST_ENV_KEY, 'ws-1'])).toBeUndefined();
    expect(queryClient.getQueryData(['workspace', TEST_ENV_KEY, 'ws-2'])).toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workspaces', TEST_ENV_KEY] });
  });
});
