import { describe, expect, it, vi } from 'vitest';
import type { LoopstackClient } from '@loopstack/client';
import { SortOrder } from '@loopstack/contracts/enums';
import { CliError } from '../errors.js';
import { resolveWorkspaceId } from './workspace.js';

/** A client stub with one app declaring `hello`, and the given workspaces of that app. */
function fakeClient(workspaces: { id: string }[]) {
  const apps = vi.fn(() => Promise.resolve([{ appName: 'greetings', workflows: [{ workflowName: 'hello' }] }]));
  const list = vi.fn(() => Promise.resolve({ data: workspaces }));
  const create = vi.fn(() => Promise.resolve({ id: 'ws-created' }));
  const client = { config: { apps }, workspaces: { list, create } } as unknown as LoopstackClient;
  return { client, apps, list, create };
}

describe('resolveWorkspaceId', () => {
  it('uses the --workspace flag without asking the backend', async () => {
    const { client, apps } = fakeClient([{ id: 'ws-newest' }]);

    await expect(resolveWorkspaceId(client, 'hello', 'ws-flag')).resolves.toBe('ws-flag');
    expect(apps).not.toHaveBeenCalled();
  });

  it("uses the newest workspace of the workflow's app", async () => {
    const { client, list, create } = fakeClient([{ id: 'ws-newest' }]);

    await expect(resolveWorkspaceId(client, 'hello')).resolves.toBe('ws-newest');
    expect(list).toHaveBeenCalledWith({
      filter: { appName: 'greetings' },
      sortBy: [{ field: 'createdAt', order: SortOrder.DESC }],
      page: 0,
      limit: 1,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a workspace for the app when it has none', async () => {
    const { client, create } = fakeClient([]);

    await expect(resolveWorkspaceId(client, 'hello')).resolves.toBe('ws-created');
    expect(create).toHaveBeenCalledWith({ title: 'CLI', appName: 'greetings' });
  });

  it('rejects a workflow no app declares', async () => {
    const { client } = fakeClient([{ id: 'ws-newest' }]);

    await expect(resolveWorkspaceId(client, 'missing')).rejects.toThrow(CliError);
    await expect(resolveWorkspaceId(client, 'missing')).rejects.toThrow('Unknown workflow "missing"');
  });
});
