import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { EnvironmentService } from '../../services/environment.service.js';
import { RemoteClient } from '../../services/remote-client.service.js';
import { RebuildAppTool } from '../rebuild-app.tool.js';

describe('RebuildAppTool', () => {
  let module: TestingModule;
  let tool: RebuildAppTool;

  const mockRemoteClient = {
    rebuildApp: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(RebuildAppTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(RebuildAppTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('declares no args schema', () => {
      expect(getBlockArgsSchema(tool)).toBeUndefined();
    });
  });

  describe('execution', () => {
    it('rebuilds the app on the remote agent', async () => {
      mockRemoteClient.rebuildApp.mockResolvedValue({ success: true, message: 'App rebuilt' });

      const result = await tool.call();

      expect(mockRemoteClient.rebuildApp).toHaveBeenCalledWith('https://agent.example');
      expect(result.data).toEqual({ success: true, message: 'App rebuilt' });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.rebuildApp.mockRejectedValue(new Error('build failed'));

      await expect(tool.call()).rejects.toThrow('build failed');
    });
  });
});
