import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientMessageService } from '@loopstack/core';
import type { WorkspaceEnvironmentEntity } from '../../entities/index.js';
import { EnvironmentService } from '../environment.service.js';
import type { RemoteClient } from '../remote-client.service.js';

const WORKSPACE_ID = 'ws-1';
const USER_ID = 'user-1';

/** Minimal repo double: `create` echoes its input so tests can assert on what `save` received. */
function makeRepo(): {
  repo: Repository<WorkspaceEnvironmentEntity>;
  findOne: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
} {
  const findOne = vi.fn();
  const save = vi.fn(async (e: unknown) => e);
  const update = vi.fn();
  const del = vi.fn();
  const create = vi.fn((e: unknown) => e);
  const repo = { findOne, save, update, delete: del, create } as unknown as Repository<WorkspaceEnvironmentEntity>;
  return { repo, findOne, save, update, delete: del };
}

function makeService(repo: Repository<WorkspaceEnvironmentEntity>): {
  service: EnvironmentService;
  dispatch: ReturnType<typeof vi.fn>;
} {
  const scope = { get: vi.fn(() => ({ workspaceId: WORKSPACE_ID, userId: USER_ID })), getOrLoad: vi.fn() };
  const remote = {} as RemoteClient;
  const dispatch = vi.fn();
  const clientMessages = { dispatchWorkspaceEvent: dispatch } as unknown as ClientMessageService;
  return { service: new EnvironmentService(scope as never, repo, remote, clientMessages), dispatch };
}

describe('EnvironmentService', () => {
  describe('markRunning', () => {
    let repo: ReturnType<typeof makeRepo>;
    let service: EnvironmentService;
    let dispatch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      repo = makeRepo();
      ({ service, dispatch } = makeService(repo.repo));
    });

    it('sets connectionUrl to the provided app URL (never the agent URL)', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.markRunning(WORKSPACE_ID, 'test', {
        agentUrl: 'http://localhost:5001',
        connectionUrl: 'http://localhost:5000',
        remoteEnvironmentId: 'container-1',
        local: true,
      });

      const saved = repo.save.mock.calls[0][0] as WorkspaceEnvironmentEntity;
      expect(saved.connectionUrl).toBe('http://localhost:5000');
      expect(saved.agentUrl).toBe('http://localhost:5001');
      expect(saved.status).toBe('running');
      expect(dispatch).toHaveBeenCalledWith('environment.updated', WORKSPACE_ID, USER_ID);
    });

    it('leaves connectionUrl unset for an agent-only slot (does not fall back to agentUrl)', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.markRunning(WORKSPACE_ID, 'claude', {
        agentUrl: 'http://localhost:5001',
        remoteEnvironmentId: 'container-1',
      });

      const saved = repo.save.mock.calls[0][0] as WorkspaceEnvironmentEntity;
      expect(saved.connectionUrl).toBeNull();
      expect(saved.agentUrl).toBe('http://localhost:5001');
    });

    it('preserves an existing connectionUrl on a re-mark that omits it', async () => {
      repo.findOne.mockResolvedValue({
        connectionUrl: 'http://localhost:5000',
        local: true,
        type: 'local',
      } as WorkspaceEnvironmentEntity);

      await service.markRunning(WORKSPACE_ID, 'test', {
        agentUrl: 'http://localhost:5002',
        remoteEnvironmentId: 'container-2',
      });

      const saved = repo.save.mock.calls[0][0] as WorkspaceEnvironmentEntity;
      expect(saved.connectionUrl).toBe('http://localhost:5000');
    });
  });

  describe('markStopped', () => {
    it('clears both agentUrl and connectionUrl and sets status stopped', async () => {
      const repo = makeRepo();
      const { service, dispatch } = makeService(repo.repo);

      await service.markStopped(WORKSPACE_ID, 'test');

      expect(repo.update).toHaveBeenCalledWith(
        { workspaceId: WORKSPACE_ID, slotId: 'test' },
        { agentUrl: null, connectionUrl: null, status: 'stopped' },
      );
      expect(dispatch).toHaveBeenCalledWith('environment.updated', WORKSPACE_ID, USER_ID);
    });
  });

  describe('replaceAll', () => {
    let repo: ReturnType<typeof makeRepo>;
    let service: EnvironmentService;

    beforeEach(() => {
      repo = makeRepo();
      ({ service } = makeService(repo.repo));
    });

    it('marks an assignment carrying a connection URL as running', async () => {
      await service.replaceAll(WORKSPACE_ID, [{ slotId: 'test', connectionUrl: 'https://app.fly.dev' }]);

      const saved = repo.save.mock.calls[0][0] as WorkspaceEnvironmentEntity[];
      expect(saved[0].status).toBe('running');
    });

    it('marks an assignment carrying only an agent URL as running', async () => {
      await service.replaceAll(WORKSPACE_ID, [{ slotId: 'test', agentUrl: 'http://agent.internal:3001' }]);

      const saved = repo.save.mock.calls[0][0] as WorkspaceEnvironmentEntity[];
      expect(saved[0].status).toBe('running');
    });

    it('marks a URL-less placeholder assignment as stopped', async () => {
      await service.replaceAll(WORKSPACE_ID, [{ slotId: 'test' }]);

      const saved = repo.save.mock.calls[0][0] as WorkspaceEnvironmentEntity[];
      expect(saved[0].status).toBe('stopped');
    });

    it('honours an explicitly provided status', async () => {
      await service.replaceAll(WORKSPACE_ID, [
        { slotId: 'test', connectionUrl: 'https://app.fly.dev', status: 'stopped' },
      ]);

      const saved = repo.save.mock.calls[0][0] as WorkspaceEnvironmentEntity[];
      expect(saved[0].status).toBe('stopped');
    });
  });
});
