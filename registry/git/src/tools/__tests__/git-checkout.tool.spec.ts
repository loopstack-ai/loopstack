import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitCheckoutTool } from '../git-checkout.tool.js';

describe('GitCheckoutTool', () => {
  let module: TestingModule;
  let tool: GitCheckoutTool;

  const mockRemoteClient = {
    gitCheckout: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitCheckoutTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitCheckoutTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires a branch', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ branch: 'main' })).not.toThrow();
    });

    it('accepts an optional create flag', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ branch: 'feature', create: true })).not.toThrow();
      expect(() => schema.parse({ branch: 'feature', create: 'yes' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ branch: 'main', extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('checks out an existing branch', async () => {
      mockRemoteClient.gitCheckout.mockResolvedValue({ branch: 'main' });

      const result = await tool.call({ branch: 'main' });

      expect(mockRemoteClient.gitCheckout).toHaveBeenCalledWith('https://agent.example', 'main', undefined);
      expect(result.data).toEqual({ branch: 'main' });
    });

    it('forwards the create flag', async () => {
      mockRemoteClient.gitCheckout.mockResolvedValue({ branch: 'feature' });

      await tool.call({ branch: 'feature', create: true });

      expect(mockRemoteClient.gitCheckout).toHaveBeenCalledWith('https://agent.example', 'feature', true);
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitCheckout.mockRejectedValue(new Error('pathspec did not match'));

      await expect(tool.call({ branch: 'nope' })).rejects.toThrow('pathspec did not match');
    });
  });
});
