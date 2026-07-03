import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TEST_ENV_KEY, createTestClient, createWrapper } from '../testing/test-utils.js';
import { useChildWorkflows, useWorkflow, useWorkflowDocuments, useWorkspace, useWorkspaceList } from './queries.js';

describe('query hooks', () => {
  it('useWorkflow fetches and caches under the SDK query key', async () => {
    const { client, workflows } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);

    const { result } = renderHook(() => useWorkflow('wf-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(workflows.get).toHaveBeenCalledWith('wf-1');
    expect(queryClient.getQueryData(['workflow', TEST_ENV_KEY, 'wf-1'])).toEqual(result.current.data);
  });

  it('useWorkflow stays idle without an id', () => {
    const { client, workflows } = createTestClient();
    const { wrapper } = createWrapper(client);

    const { result } = renderHook(() => useWorkflow(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(workflows.get).not.toHaveBeenCalled();
  });

  it('useWorkflow respects a host-supplied enabled option', () => {
    const { client, workflows } = createTestClient();
    const { wrapper } = createWrapper(client);

    const { result } = renderHook(() => useWorkflow('wf-1', { enabled: false }), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(workflows.get).not.toHaveBeenCalled();
  });

  it('useWorkflowDocuments requests visible documents in display order', async () => {
    const { client, documents } = createTestClient();
    const { wrapper } = createWrapper(client);

    const { result } = renderHook(() => useWorkflowDocuments('wf-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(documents.list).toHaveBeenCalledWith({
      filter: { workflowId: 'wf-1', isInvalidated: false },
      sortBy: [{ field: 'index', order: 'ASC' }],
    });
  });

  it('useChildWorkflows lists children oldest-first and supports select', async () => {
    const { client, workflows } = createTestClient();
    workflows.list.mockResolvedValue({ data: [{ id: 'child-1' }], total: 1, page: 0, limit: 100 });
    const { wrapper } = createWrapper(client);

    const { result } = renderHook(() => useChildWorkflows('parent-1', { select: (page) => page.data }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(workflows.list).toHaveBeenCalledWith({
      filter: { parentId: 'parent-1' },
      sortBy: [{ field: 'createdAt', order: 'ASC' }],
      page: 0,
      limit: 100,
    });
    expect(result.current.data).toEqual([{ id: 'child-1' }]);
  });

  it('useWorkspace fetches and caches under the SDK query key, idle without an id', async () => {
    const { client, workspaces } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);

    const idle = renderHook(() => useWorkspace(undefined), { wrapper });
    expect(idle.result.current.fetchStatus).toBe('idle');

    const { result } = renderHook(() => useWorkspace('ws-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(workspaces.get).toHaveBeenCalledWith('ws-1');
    expect(queryClient.getQueryData(['workspace', TEST_ENV_KEY, 'ws-1'])).toEqual(result.current.data);
  });

  it('useWorkspaceList forwards list params and keys by them', async () => {
    const { client, workspaces } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);

    const params = { filter: { appName: 'hello-app' }, page: 0, limit: 10 };
    const { result } = renderHook(() => useWorkspaceList(params), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(workspaces.list).toHaveBeenCalledWith(params);
    expect(queryClient.getQueryData(['workspaces', TEST_ENV_KEY, 'list', params])).toEqual(result.current.data);
  });
});
