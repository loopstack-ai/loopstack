import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { EnvironmentService } from '../../services/environment.service.js';
import { RemoteClient } from '../../services/remote-client.service.js';
import { BashTool } from '../bash.tool.js';

describe('BashTool', () => {
  let module: TestingModule;
  let tool: BashTool;

  const mockRemoteClient = {
    executeCommand: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(BashTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(BashTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires a command', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
    });

    it('accepts an optional timeout', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ command: 'ls', timeout: 5000 })).not.toThrow();
    });

    it('rejects extra properties', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ command: 'ls', extra: 'nope' })).toThrow();
    });
  });

  describe('execution', () => {
    it('runs the command on the remote agent and returns stdout/stderr/exitCode', async () => {
      mockRemoteClient.executeCommand.mockResolvedValue({ stdout: 'hi\n', stderr: '', exitCode: 0 });

      const result = await tool.call({ command: 'echo hi' });

      expect(mockRemoteClient.executeCommand).toHaveBeenCalledWith(
        'https://agent.example',
        'echo hi',
        undefined,
        undefined,
      );
      expect(result.data).toEqual({ stdout: 'hi\n', stderr: '', exitCode: 0 });
    });

    it('passes the timeout through to RemoteClient', async () => {
      mockRemoteClient.executeCommand.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      await tool.call({ command: 'sleep 1', timeout: 500 });

      expect(mockRemoteClient.executeCommand).toHaveBeenCalledWith('https://agent.example', 'sleep 1', undefined, 500);
    });
  });
});
