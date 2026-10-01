import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { SecretService } from '@loopstack/secrets-module';
import { createToolTest } from '@loopstack/testing';
import { EnvironmentService } from '../../services/environment.service.js';
import { RemoteClient } from '../../services/remote-client.service.js';
import { SyncSecretsTool } from '../sync-secrets.tool.js';

describe('SyncSecretsTool', () => {
  let module: TestingModule;
  let tool: SyncSecretsTool;

  const mockRemoteClient = {
    setEnvVars: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };
  const mockSecretService = {
    findAllByWorkspace: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(SyncSecretsTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .withMock(SecretService, mockSecretService)
      .compile();

    tool = module.get(SyncSecretsTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('accepts no arguments', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ restart: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('syncs the workspace secrets as env vars', async () => {
      mockSecretService.findAllByWorkspace.mockResolvedValue([
        { id: 's1', key: 'API_KEY', value: 'secret-1', workspaceId: 'test-workspace' },
        { id: 's2', key: 'DB_URL', value: 'postgres://x', workspaceId: 'test-workspace' },
      ]);
      mockRemoteClient.setEnvVars.mockResolvedValue({ success: true, count: 2, restarted: true });

      const result = await tool.call({});

      expect(mockSecretService.findAllByWorkspace).toHaveBeenCalledWith('test-workspace');
      expect(mockRemoteClient.setEnvVars).toHaveBeenCalledWith('https://agent.example', [
        { key: 'API_KEY', value: 'secret-1' },
        { key: 'DB_URL', value: 'postgres://x' },
      ]);
      expect(result.data).toEqual({ success: true, count: 2 });
    });

    it('skips the remote call when there are no secrets', async () => {
      mockSecretService.findAllByWorkspace.mockResolvedValue([]);

      const result = await tool.call({});

      expect(mockEnv.getAgentUrl).not.toHaveBeenCalled();
      expect(mockRemoteClient.setEnvVars).not.toHaveBeenCalled();
      expect(result.data).toEqual({ success: true, count: 0, message: 'No secrets to sync' });
    });

    it('reports an unsuccessful sync', async () => {
      mockSecretService.findAllByWorkspace.mockResolvedValue([{ key: 'API_KEY', value: 'secret-1' }]);
      mockRemoteClient.setEnvVars.mockResolvedValue({ success: false, count: 0 });

      const result = await tool.call({});

      expect(result.data).toEqual({ success: false, count: 0 });
    });

    it('propagates RemoteClient failures', async () => {
      mockSecretService.findAllByWorkspace.mockResolvedValue([{ key: 'API_KEY', value: 'secret-1' }]);
      mockRemoteClient.setEnvVars.mockRejectedValue(new Error('Remote agent error: 500'));

      await expect(tool.call({})).rejects.toThrow('Remote agent error: 500');
    });
  });
});
