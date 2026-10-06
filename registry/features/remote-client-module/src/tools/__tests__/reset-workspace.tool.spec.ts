import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { EnvironmentService } from '../../services/environment.service.js';
import { RemoteClient } from '../../services/remote-client.service.js';
import { ResetWorkspaceTool } from '../reset-workspace.tool.js';

describe('ResetWorkspaceTool', () => {
  let module: TestingModule;
  let tool: ResetWorkspaceTool;

  const mockRemoteClient = {
    resetWorkspace: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(ResetWorkspaceTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(ResetWorkspaceTool);
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
    it('resets the workspace on the remote agent', async () => {
      mockRemoteClient.resetWorkspace.mockResolvedValue({ success: true, message: 'Workspace reset' });

      const result = await tool.call();

      expect(mockRemoteClient.resetWorkspace).toHaveBeenCalledWith('https://agent.example');
      expect(result.data).toEqual({ success: true, message: 'Workspace reset' });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.resetWorkspace.mockRejectedValue(new Error('reset failed'));

      await expect(tool.call()).rejects.toThrow('reset failed');
    });
  });
});
