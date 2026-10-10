import { TestingModule } from '@nestjs/testing';
import type { Question } from '@typesafe-ai/sdk';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { toJSONSchema } from 'zod';
import { getBlockArgsSchema, getBlockName } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { choice, noul, score } from '../../index.js';
import { TypeSafeClientService } from '../../services/index.js';
import { type TypeSafeQuestion, TypeSafeSystemOneResultSchema } from '../../types/index.js';
import { TypeSafeSystemOneTool } from '../typesafe-system-one.tool.js';

describe('TypeSafeSystemOneTool', () => {
  let module: TestingModule;
  let tool: TypeSafeSystemOneTool;

  const mockClient = { systemOne: vi.fn() };
  const apiResult = {
    model: 'jev-1',
    answers: {
      category: { type: 'choice', choice: 'billing', confidence: 0.9, probabilities: { billing: 0.9, other: 0.1 } },
      urgent: { type: 'noul', noul: 0.8 },
      tone: {
        type: 'score',
        score: 1.4,
        confidence: 0.7,
        legend: { '0': 'calm', '1': 'annoyed', '2': 'angry' },
        probabilities: { '0': 0.1, '1': 0.4, '2': 0.5 },
      },
    },
    usage: { input_tokens: 120, output_tokens: 3 },
  };
  const questions = {
    category: choice('What is this ticket about?', { billing: null, other: null }),
    urgent: noul('Is this urgent?'),
    tone: score('How upset is the customer?', ['calm', 'annoyed', 'angry']),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    module = await createToolTest()
      .forTool(TypeSafeSystemOneTool)
      .withMock(TypeSafeClientService, mockClient)
      .compile();
    tool = module.get(TypeSafeSystemOneTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('registers as typesafe_system_one', () => {
    expect(getBlockName(tool)).toBe('typesafe_system_one');
  });

  describe('validation', () => {
    it('accepts questions built with the SDK helpers', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ state: { document: 'I was charged twice.' }, questions })).not.toThrow();
      expect(() => schema.parse({ state: null, questions: { q: { type: 'noul' } } })).not.toThrow();
    });

    it('rejects empty questions', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ state: 'x', questions: {} })).toThrow();
    });

    it('rejects a score question with fewer than two levels', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ state: 'x', questions: { q: { type: 'score', criteria: ['only'] } } })).toThrow();
    });

    it('rejects an unknown question type', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ state: 'x', questions: { q: { type: 'rank', criteria: {} } } })).toThrow();
    });

    it('converts the args schema to JSON Schema for agents', () => {
      expect(() => toJSONSchema(getBlockArgsSchema(tool)!)).not.toThrow();
    });

    it('produces questions the SDK accepts', () => {
      expectTypeOf<TypeSafeQuestion>().toExtend<Question>();
    });
  });

  describe('execution', () => {
    it('forwards state, questions, model, api key env var and signal', async () => {
      mockClient.systemOne.mockResolvedValue(apiResult);

      await tool.call(
        { state: 'I was charged twice.', questions },
        { config: { model: 'jev-1', envApiKey: 'MY_KEY' } },
      );

      expect(mockClient.systemOne).toHaveBeenCalledWith(
        { state: 'I was charged twice.', questions, model: 'jev-1' },
        { envApiKey: 'MY_KEY', signal: expect.any(AbortSignal) as AbortSignal },
      );
    });

    it('omits the model when none is configured', async () => {
      mockClient.systemOne.mockResolvedValue(apiResult);

      await tool.call({ state: 'x', questions });

      expect(mockClient.systemOne.mock.calls[0][0]).toEqual({ state: 'x', questions });
    });

    it('returns the answers and reports model and usage as metadata', async () => {
      mockClient.systemOne.mockResolvedValue(apiResult);

      const result = await tool.call({ state: 'x', questions });

      expect(result.data).toEqual(apiResult);
      expect(() => TypeSafeSystemOneResultSchema.parse(result.data)).not.toThrow();
      expect(result.metadata).toEqual({
        provider: 'typesafe',
        model: 'jev-1',
        usage: { inputTokens: 120, outputTokens: 3 },
      });
    });
  });
});
