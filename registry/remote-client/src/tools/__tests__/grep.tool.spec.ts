import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { EnvironmentService } from '../../services/environment.service.js';
import { RemoteClient } from '../../services/remote-client.service.js';
import { GrepTool } from '../grep.tool.js';

describe('GrepTool', () => {
  let module: TestingModule;
  let tool: GrepTool;

  const mockRemoteClient = {
    grep: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GrepTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GrepTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires a pattern', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ pattern: 'TODO' })).not.toThrow();
    });

    it('accepts optional path, glob, type and case_insensitive', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() =>
        schema.parse({ pattern: 'TODO', path: 'src', glob: '*.ts', type: 'ts', case_insensitive: true }),
      ).not.toThrow();
      expect(() => schema.parse({ pattern: 'TODO', case_insensitive: 'yes' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ pattern: 'TODO', extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('greps on the remote agent', async () => {
      const matches = { matches: [{ file: 'src/a.ts', line: 3, content: '// TODO' }] };
      mockRemoteClient.grep.mockResolvedValue(matches);

      const result = await tool.call({ pattern: 'TODO' });

      expect(mockRemoteClient.grep).toHaveBeenCalledWith('https://agent.example', 'TODO', undefined, {
        glob: undefined,
        type: undefined,
        caseInsensitive: undefined,
      });
      expect(result.data).toEqual(matches);
    });

    it('maps the filter options', async () => {
      mockRemoteClient.grep.mockResolvedValue({ matches: [] });

      await tool.call({ pattern: 'todo', path: 'src', glob: '*.ts', type: 'ts', case_insensitive: true });

      expect(mockRemoteClient.grep).toHaveBeenCalledWith('https://agent.example', 'todo', 'src', {
        glob: '*.ts',
        type: 'ts',
        caseInsensitive: true,
      });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.grep.mockRejectedValue(new Error('Remote agent error: 500'));

      await expect(tool.call({ pattern: 'TODO' })).rejects.toThrow('Remote agent error: 500');
    });
  });
});
