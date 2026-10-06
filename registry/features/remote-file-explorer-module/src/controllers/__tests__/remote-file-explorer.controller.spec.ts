import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUserInterface } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { RemoteFileExplorerController } from '../remote-file-explorer.controller.js';

const WORKSPACE_ID = 'ws-1';
const AGENT_URL = 'http://agent:5001';
const user = { userId: 'user-1' } as CurrentUserInterface;

describe('RemoteFileExplorerController', () => {
  let controller: RemoteFileExplorerController;
  let env: { getAgentUrlForWorkspace: ReturnType<typeof vi.fn> };
  let remote: { getFileTree: ReturnType<typeof vi.fn>; readFile: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    env = { getAgentUrlForWorkspace: vi.fn().mockResolvedValue(AGENT_URL) };
    remote = { getFileTree: vi.fn(), readFile: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [RemoteFileExplorerController],
      providers: [
        { provide: RemoteClient, useValue: remote },
        { provide: EnvironmentService, useValue: env },
      ],
    }).compile();

    controller = moduleRef.get(RemoteFileExplorerController);
  });

  describe('getFileTree', () => {
    it('resolves the agent URL for the workspace and slot and returns the remote tree', async () => {
      const tree = [{ name: 'src', type: 'directory' }];
      remote.getFileTree.mockResolvedValue(tree);

      const result = await controller.getFileTree(WORKSPACE_ID, 'src', 'slot-a', user);

      expect(result).toBe(tree);
      expect(env.getAgentUrlForWorkspace).toHaveBeenCalledWith(WORKSPACE_ID, 'slot-a');
      expect(remote.getFileTree).toHaveBeenCalledWith(AGENT_URL, 'src');
    });

    it('forwards undefined path and slot unchanged', async () => {
      remote.getFileTree.mockResolvedValue([]);

      await controller.getFileTree(WORKSPACE_ID, undefined, undefined, user);

      expect(env.getAgentUrlForWorkspace).toHaveBeenCalledWith(WORKSPACE_ID, undefined);
      expect(remote.getFileTree).toHaveBeenCalledWith(AGENT_URL, undefined);
    });

    it('propagates an agent URL resolution failure without calling the remote', async () => {
      env.getAgentUrlForWorkspace.mockRejectedValue(new Error('no running environment'));

      await expect(controller.getFileTree(WORKSPACE_ID, 'src', undefined, user)).rejects.toThrow(
        'no running environment',
      );
      expect(remote.getFileTree).not.toHaveBeenCalled();
    });

    it('propagates a remote client failure', async () => {
      remote.getFileTree.mockRejectedValue(new Error('agent unreachable'));

      await expect(controller.getFileTree(WORKSPACE_ID, 'src', undefined, user)).rejects.toThrow('agent unreachable');
    });
  });

  describe('readFile', () => {
    it('resolves the agent URL for the workspace and slot and returns the remote file', async () => {
      const file = { path: 'src/index.ts', content: 'export {};' };
      remote.readFile.mockResolvedValue(file);

      const result = await controller.readFile(WORKSPACE_ID, 'src/index.ts', 'slot-a', user);

      expect(result).toBe(file);
      expect(env.getAgentUrlForWorkspace).toHaveBeenCalledWith(WORKSPACE_ID, 'slot-a');
      expect(remote.readFile).toHaveBeenCalledWith(AGENT_URL, 'src/index.ts');
    });

    it('forwards an undefined slot unchanged', async () => {
      remote.readFile.mockResolvedValue({ path: 'a.txt', content: '' });

      await controller.readFile(WORKSPACE_ID, 'a.txt', undefined, user);

      expect(env.getAgentUrlForWorkspace).toHaveBeenCalledWith(WORKSPACE_ID, undefined);
    });

    it('propagates an agent URL resolution failure without calling the remote', async () => {
      env.getAgentUrlForWorkspace.mockRejectedValue(new Error('no running environment'));

      await expect(controller.readFile(WORKSPACE_ID, 'a.txt', undefined, user)).rejects.toThrow(
        'no running environment',
      );
      expect(remote.readFile).not.toHaveBeenCalled();
    });

    it('propagates a remote client failure', async () => {
      remote.readFile.mockRejectedValue(new Error('file not found'));

      await expect(controller.readFile(WORKSPACE_ID, 'missing.txt', undefined, user)).rejects.toThrow('file not found');
    });
  });
});
