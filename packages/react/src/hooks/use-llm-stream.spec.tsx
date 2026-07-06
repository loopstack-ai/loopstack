import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestClient, createWrapper } from '../testing/test-utils.js';
import { useLlmStream } from './use-llm-stream.js';

const base = { userId: 'u1', workerId: 'w1', workflowId: 'wf-1', messageId: 'm1' };

describe('useLlmStream', () => {
  it('accumulates deltas and finalizes on done', () => {
    const { client, stream } = createTestClient();
    const { wrapper } = createWrapper(client);

    const { result } = renderHook(() => useLlmStream('wf-1'), { wrapper });

    act(() => stream.emit({ ...base, type: 'llm.response.start' }));
    act(() => stream.emit({ ...base, type: 'llm.response.text_delta', delta: 'Hel' }));
    act(() => stream.emit({ ...base, type: 'llm.response.text_delta', delta: 'lo' }));

    expect(result.current['m1'].text).toBe('Hello');
    expect(result.current['m1'].completed).toBe(false);

    const message = { role: 'assistant', content: [], text: 'Hello' };
    act(() => stream.emit({ ...base, type: 'llm.response.done', message }));

    expect(result.current['m1'].completed).toBe(true);
    expect(result.current['m1'].message).toEqual(message);
  });

  it('ignores events of other workflows and non-LLM events', () => {
    const { client, stream } = createTestClient();
    const { wrapper } = createWrapper(client);

    const { result } = renderHook(() => useLlmStream('wf-1'), { wrapper });

    act(() => stream.emit({ ...base, workflowId: 'wf-other', type: 'llm.response.text_delta', delta: 'nope' }));
    act(() => stream.emit({ type: 'workflow.updated', userId: 'u1', workerId: 'w1', id: 'wf-1', status: 'running' }));
    act(() => stream.emit({ type: 'future.event', raw: {} }));

    expect(result.current).toEqual({});
  });

  it('resets state when the workflowId changes', () => {
    const { client, stream } = createTestClient();
    const { wrapper } = createWrapper(client);

    const { result, rerender } = renderHook(({ id }: { id: string | undefined }) => useLlmStream(id), {
      wrapper,
      initialProps: { id: 'wf-1' as string | undefined },
    });

    act(() => stream.emit({ ...base, type: 'llm.response.text_delta', delta: 'Hi' }));
    expect(result.current['m1'].text).toBe('Hi');

    rerender({ id: 'wf-2' });
    expect(result.current).toEqual({});
  });

  it('does not subscribe without a workflowId', () => {
    const { client, stream } = createTestClient();
    const { wrapper } = createWrapper(client);

    renderHook(() => useLlmStream(undefined), { wrapper });

    expect(stream.handlerCount()).toBe(0);
  });
});
