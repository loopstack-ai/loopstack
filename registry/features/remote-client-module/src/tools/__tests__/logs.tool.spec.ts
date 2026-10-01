import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { EnvironmentService } from '../../services/environment.service.js';
import { RemoteClient } from '../../services/remote-client.service.js';
import { LogsTool } from '../logs.tool.js';

describe('LogsTool', () => {
  let module: TestingModule;
  let tool: LogsTool;

  const mockRemoteClient = {
    getLogs: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(LogsTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(LogsTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('accepts optional lines and type', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ lines: 50, type: 'error' })).not.toThrow();
    });

    it('rejects an unknown log type', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ type: 'debug' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ follow: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches logs with defaults', async () => {
      mockRemoteClient.getLogs.mockResolvedValue({ stdout: 'started', stderr: '' });

      const result = await tool.call({});

      expect(mockRemoteClient.getLogs).toHaveBeenCalledWith('https://agent.example', undefined, undefined);
      expect(result.data).toEqual({ stdout: 'started', stderr: '' });
    });

    it('forwards lines and type and keeps only stdout and stderr', async () => {
      mockRemoteClient.getLogs.mockResolvedValue({ stdout: '', stderr: 'boom', truncated: true });

      const result = await tool.call({ lines: 10, type: 'error' });

      expect(mockRemoteClient.getLogs).toHaveBeenCalledWith('https://agent.example', 10, 'error');
      expect(result.data).toEqual({ stdout: '', stderr: 'boom' });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.getLogs.mockRejectedValue(new Error('Remote agent error: 503'));

      await expect(tool.call({})).rejects.toThrow('Remote agent error: 503');
    });
  });
});
