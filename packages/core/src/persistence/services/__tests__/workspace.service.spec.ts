import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceService } from '../workspace.service.js';

/**
 * A deleted workspace is announced, because everything the host app holds for it — its disk state, its
 * containers, its claims — is released by listeners on that event. A delete that does not happen announces
 * nothing.
 */
function service(rows: { id: string; appName: string; createdBy: string }[]) {
  const repository = {
    findOne: vi.fn(({ where }: { where: { id: string; createdBy: string } }) =>
      Promise.resolve(rows.find((row) => row.id === where.id && row.createdBy === where.createdBy) ?? null),
    ),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
  };
  const events = { emit: vi.fn() };
  return { workspaces: new WorkspaceService(repository as never, events as never), repository, events };
}

describe('WorkspaceService.delete', () => {
  it('deletes the user’s workspace and emits workspace.deleted after it', async () => {
    const { workspaces, repository, events } = service([{ id: 'ws-1', appName: 'worker', createdBy: 'u1' }]);

    await workspaces.delete('ws-1', 'u1');

    expect(repository.delete).toHaveBeenCalledWith({ id: 'ws-1', createdBy: 'u1' });
    expect(events.emit).toHaveBeenCalledWith('workspace.deleted', { id: 'ws-1', appName: 'worker', user: 'u1' });
    expect(repository.delete.mock.invocationCallOrder[0]).toBeLessThan(events.emit.mock.invocationCallOrder[0]);
  });

  it('refuses another user’s workspace and emits nothing', async () => {
    const { workspaces, repository, events } = service([{ id: 'ws-1', appName: 'worker', createdBy: 'u1' }]);

    await expect(workspaces.delete('ws-1', 'u2')).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.delete).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});
