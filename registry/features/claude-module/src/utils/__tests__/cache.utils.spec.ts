import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { applyCacheBreakpoints } from '../cache.utils.js';

const EPHEMERAL = { type: 'ephemeral' };

const tool = (name: string): Anthropic.Tool => ({ name, input_schema: { type: 'object' } });

const countBreakpoints = (value: unknown): number => JSON.stringify(value).split('"cache_control"').length - 1;

describe('applyCacheBreakpoints', () => {
  it('converts a string system prompt into a cached text block', () => {
    const result = applyCacheBreakpoints({ system: 'Be helpful.', messages: [] });

    expect(result.system).toEqual([{ type: 'text', text: 'Be helpful.', cache_control: EPHEMERAL }]);
  });

  it('marks only the last tool definition', () => {
    const result = applyCacheBreakpoints({ tools: [tool('a'), tool('b'), tool('c')], messages: [] });

    expect(result.tools).toEqual([tool('a'), tool('b'), { ...tool('c'), cache_control: EPHEMERAL }]);
  });

  it('converts string content of the last message into a cached text block', () => {
    const result = applyCacheBreakpoints({
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
      ],
    });

    expect(result.messages).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'second' },
      { role: 'user', content: [{ type: 'text', text: 'third', cache_control: EPHEMERAL }] },
    ]);
  });

  it('marks the last content block of the last message', () => {
    const result = applyCacheBreakpoints({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'one' },
            { type: 'tool_result', tool_use_id: 't1', content: 'ok' },
          ],
        },
      ],
    });

    expect(result.messages[0].content).toEqual([
      { type: 'text', text: 'one' },
      { type: 'tool_result', tool_use_id: 't1', content: 'ok', cache_control: EPHEMERAL },
    ]);
  });

  it('places at most one breakpoint each on system, tools and messages', () => {
    const result = applyCacheBreakpoints({
      system: 'sys',
      tools: [tool('a'), tool('b')],
      messages: [
        { role: 'user', content: 'q1' },
        { role: 'assistant', content: [{ type: 'text', text: 'a1' }] },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'q2a' },
            { type: 'text', text: 'q2b' },
          ],
        },
      ],
    });

    expect(countBreakpoints(result.system)).toBe(1);
    expect(countBreakpoints(result.tools)).toBe(1);
    expect(countBreakpoints(result.messages)).toBe(1);
  });

  it('does not mutate the input', () => {
    const input = {
      system: 'sys',
      tools: [tool('a')],
      messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'hi' }] }],
    };
    const snapshot = structuredClone(input);

    const result = applyCacheBreakpoints(input);

    expect(input).toEqual(snapshot);
    expect(result.tools).not.toBe(input.tools);
    expect(result.messages).not.toBe(input.messages);
  });

  it('passes through absent system and tools and empty messages', () => {
    const result = applyCacheBreakpoints({ messages: [] });

    expect(result).toEqual({ system: undefined, tools: undefined, messages: [] });
  });

  it('leaves an empty tools array untouched', () => {
    const tools: Anthropic.Tool[] = [];

    expect(applyCacheBreakpoints({ tools, messages: [] }).tools).toBe(tools);
  });

  it('leaves a last message with empty block content untouched', () => {
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: [] }];

    expect(applyCacheBreakpoints({ messages }).messages).toEqual([{ role: 'user', content: [] }]);
  });
});
