import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { EnvironmentService } from '../../services/environment.service.js';
import { RemoteClient } from '../../services/remote-client.service.js';
import { GlobTool } from '../glob.tool.js';

describe('GlobTool', () => {
  let module: TestingModule;
  let tool: GlobTool;

  const mockRemoteClient = {
    glob: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GlobTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GlobTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires a pattern', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ pattern: '**/*.ts' })).not.toThrow();
    });

    it('accepts an optional path', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ pattern: '**/*.ts', path: 'src' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ pattern: '**/*.ts', extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('globs on the remote agent', async () => {
      mockRemoteClient.glob.mockResolvedValue({ files: ['src/a.ts', 'src/b.ts'] });

      const result = await tool.call({ pattern: '**/*.ts' });

      expect(mockRemoteClient.glob).toHaveBeenCalledWith('https://agent.example', '**/*.ts', undefined);
      expect(result.data).toEqual({ files: ['src/a.ts', 'src/b.ts'] });
    });

    it('forwards the search path', async () => {
      mockRemoteClient.glob.mockResolvedValue({ files: [] });

      await tool.call({ pattern: '*.json', path: 'config' });

      expect(mockRemoteClient.glob).toHaveBeenCalledWith('https://agent.example', '*.json', 'config');
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.glob.mockRejectedValue(new Error('Remote agent error: 500'));

      await expect(tool.call({ pattern: '**/*.ts' })).rejects.toThrow('Remote agent error: 500');
    });
  });
});
