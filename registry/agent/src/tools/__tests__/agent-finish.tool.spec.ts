import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { AgentFinishTool } from '../agent-finish.tool.js';

describe('AgentFinishTool', () => {
  let module: TestingModule;
  let tool: AgentFinishTool;

  beforeEach(async () => {
    module = await createToolTest().forTool(AgentFinishTool).compile();

    tool = module.get(AgentFinishTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('accepts an omitted result and any result value', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ result: 'done' })).not.toThrow();
      expect(() => schema.parse({ result: { summary: 'done', files: ['a.ts'] } })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ result: 'done', extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('wraps a structured result in the finish sentinel', async () => {
      const result = await tool.call({ result: { summary: 'done', files: ['a.ts'] } });

      expect(result.data).toEqual({ __agentFinish: true, result: { summary: 'done', files: ['a.ts'] } });
    });

    it('wraps a string result in the finish sentinel', async () => {
      const result = await tool.call({ result: 'done' });

      expect(result.data).toEqual({ __agentFinish: true, result: 'done' });
    });

    it('maps an omitted result to null', async () => {
      const result = await tool.call({});

      expect(result.data).toEqual({ __agentFinish: true, result: null });
    });

    it('keeps falsy non-nullish results', async () => {
      expect((await tool.call({ result: 0 })).data).toEqual({ __agentFinish: true, result: 0 });
      expect((await tool.call({ result: false })).data).toEqual({ __agentFinish: true, result: false });
      expect((await tool.call({ result: '' })).data).toEqual({ __agentFinish: true, result: '' });
    });
  });
});
