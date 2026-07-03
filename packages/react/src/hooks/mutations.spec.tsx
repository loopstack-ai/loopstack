import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TEST_ENV_KEY, createTestClient, createWrapper } from '../testing/test-utils.js';
import { useDeleteWorkflow, useRunWorkflow, useStartWorkflow, useUpdateWorkflow } from './mutations.js';

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
});
