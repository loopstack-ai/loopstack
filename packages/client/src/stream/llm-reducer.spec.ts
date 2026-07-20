import { describe, expect, it } from 'vitest';
import type { LlmResponseEvent } from '@loopstack/contracts/events';
import { reduceLlmStream } from './llm-reducer.js';
import type { LlmStreamState } from './llm-reducer.js';

const base = { userId: 'u1', workerId: 'w1', workflowId: 'wf-1', messageId: 'm1' };

function run(events: LlmResponseEvent[]): LlmStreamState {
  return events.reduce(reduceLlmStream, {});
}

describe('reduceLlmStream', () => {
  it('accumulates a full streaming cycle', () => {
    const state = run([
      { ...base, type: 'llm.response.start' },
      { ...base, type: 'llm.response.thinking_delta', delta: 'hmm ' },
      { ...base, type: 'llm.response.text_delta', delta: 'Hello' },
      { ...base, type: 'llm.response.text_delta', delta: ' world' },
      { ...base, type: 'llm.response.tool_call', id: 't1', name: 'read_file', args: { path: 'a.ts' } },
      { ...base, type: 'llm.response.done', message: { role: 'assistant', text: 'Hello world' } },
    ]);

    expect(state.m1).toMatchObject({
      messageId: 'm1',
      workflowId: 'wf-1',
      text: 'Hello world',
      thinking: 'hmm ',
      toolCalls: [{ id: 't1', name: 'read_file', args: { path: 'a.ts' } }],
      completed: true,
      message: { role: 'assistant', text: 'Hello world' },
    });
  });

  it('tracks multiple messages independently and does not mutate prior state', () => {
    const first = run([{ ...base, type: 'llm.response.text_delta', delta: 'a' }]);
    const second = reduceLlmStream(first, {
      ...base,
      messageId: 'm2',
      type: 'llm.response.text_delta',
      delta: 'b',
    });

    expect(first.m2).toBeUndefined();
    expect(second.m1.text).toBe('a');
    expect(second.m2.text).toBe('b');
  });

  it('records errors as completed with the message preserved so far', () => {
    const state = run([
      { ...base, type: 'llm.response.text_delta', delta: 'partial' },
      { ...base, type: 'llm.response.error', error: 'rate limited' },
    ]);

    expect(state.m1).toMatchObject({ text: 'partial', completed: true, error: 'rate limited' });
  });

  it('handles deltas arriving without an explicit start', () => {
    const state = run([{ ...base, type: 'llm.response.text_delta', delta: 'x' }]);
    expect(state.m1.text).toBe('x');
    expect(state.m1.completed).toBe(false);
  });
});
