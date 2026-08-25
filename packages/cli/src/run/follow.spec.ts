import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { ClientMessage } from '@loopstack/contracts/events';
import { followRun } from './follow.js';
import type { IdleOutcome } from './follow.js';

/** Push-based stand-in for the SSE event iterator. */
function eventQueue() {
  const buffer: ClientMessage[] = [];
  let notify: (() => void) | undefined;
  const iterator: AsyncIterableIterator<ClientMessage> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      while (buffer.length === 0) {
        await new Promise<void>((resolve) => (notify = resolve));
      }
      return { value: buffer.shift()!, done: false };
    },
  };
  return {
    iterator,
    push(event: ClientMessage) {
      buffer.push(event);
      notify?.();
      notify = undefined;
    },
  };
}

function captureSink() {
  let text = '';
  const out = new Writable({
    write(chunk, _encoding, callback) {
      text += String(chunk);
      callback();
    },
  });
  return { out, text: () => text };
}

const updated = (workflowId: string, status: WorkflowState, place?: string, parentId?: string): ClientMessage =>
  ({ type: 'workflow.updated', workflowId, status, place, parentId }) as unknown as ClientMessage;

const created = (workflowId: string, parentId: string): ClientMessage =>
  ({ type: 'workflow.created', workflowId, parentId }) as unknown as ClientMessage;

const documentCreated = (workflowId: string): ClientMessage =>
  ({ type: 'document.created', workflowId }) as unknown as ClientMessage;

const delta = (workflowId: string, text: string, messageId = 'msg-1'): ClientMessage =>
  ({ type: 'llm.response.text_delta', workflowId, delta: text, messageId }) as unknown as ClientMessage;

const streamStart = (workflowId: string, messageId: string): ClientMessage =>
  ({ type: 'llm.response.start', workflowId, messageId }) as unknown as ClientMessage;

const toolCall = (workflowId: string, id: string, name: string, args: Record<string, unknown>): ClientMessage =>
  ({ type: 'llm.response.tool_call', workflowId, messageId: 'msg-1', id, name, args }) as unknown as ClientMessage;

const reset = (): ClientMessage => ({ type: 'stream.reset', userId: null, workerId: '' }) as unknown as ClientMessage;

const ROOT = 'root-1';
const SUB = 'sub-1';

describe('followRun', () => {
  it('renders places and returns on a terminal state', async () => {
    const queue = eventQueue();
    const { out, text } = captureSink();
    const run = followRun(queue.iterator, ROOT, out);

    queue.push(updated(ROOT, WorkflowState.Running, 'start'));
    queue.push(updated(ROOT, WorkflowState.Completed, 'end'));

    const outcome = await run;
    expect(outcome.status).toBe(WorkflowState.Completed);
    expect(text()).toContain('▸ start');
  });

  it('keeps following after a terminal answer', async () => {
    const queue = eventQueue();
    const { out } = captureSink();
    const run = followRun(queue.iterator, ROOT, out, {
      onIdle: () => {
        // Simulate a submitted answer: the workflow resumes right after.
        queueMicrotask(() => {
          queue.push(updated(ROOT, WorkflowState.Running, 'resumed'));
          queue.push(updated(ROOT, WorkflowState.Completed, 'end'));
        });
        return Promise.resolve<IdleOutcome>('answered');
      },
    });

    queue.push(updated(ROOT, WorkflowState.Waiting, 'ask'));

    const outcome = await run;
    expect(outcome.status).toBe(WorkflowState.Completed);
  });

  it('aborts the open prompt when the prompting sub-workflow resolves externally', async () => {
    const queue = eventQueue();
    const { out, text } = captureSink();

    const run = followRun(queue.iterator, ROOT, out, {
      onIdle: (signal, onPromptWorkflow) => {
        onPromptWorkflow(SUB);
        // A real prompt blocks on stdin until aborted — model exactly that.
        return new Promise<IdleOutcome>((resolve) =>
          signal.addEventListener('abort', () => resolve('external'), { once: true }),
        );
      },
    });

    queue.push(updated(ROOT, WorkflowState.Waiting, 'ask'));
    // The answer arrives from Studio: the sub-workflow leaves its wait state.
    queue.push(updated(SUB, WorkflowState.Running));
    queue.push(updated(ROOT, WorkflowState.Completed, 'end'));

    const outcome = await run;
    expect(outcome.status).toBe(WorkflowState.Completed);
    expect(text()).toContain('answered in Studio');
  });

  it('stops following when the idle handler has nothing to collect', async () => {
    const queue = eventQueue();
    const { out } = captureSink();
    const run = followRun(queue.iterator, ROOT, out, {
      onIdle: () => Promise.resolve<IdleOutcome>('stop'),
    });

    queue.push(updated(ROOT, WorkflowState.Waiting, 'ask'));

    const outcome = await run;
    expect(outcome.status).toBe(WorkflowState.Waiting);
  });

  it('renders documents of the run and its sub-workflows, but not of strangers', async () => {
    const queue = eventQueue();
    const { out } = captureSink();
    const rendered: string[] = [];

    const run = followRun(queue.iterator, ROOT, out, {
      onDocument: (workflowId) => {
        rendered.push(workflowId);
        return Promise.resolve();
      },
    });

    queue.push(documentCreated(ROOT)); // own document
    queue.push(created(SUB, ROOT)); // sub-workflow spawned under the run
    queue.push(documentCreated(SUB)); // its document renders too
    queue.push(documentCreated('stranger-1')); // unrelated run — ignored
    queue.push(updated(ROOT, WorkflowState.Completed, 'end'));

    await run;
    expect(rendered).toEqual([ROOT, SUB]);
  });

  it('streams LLM tokens from sub-workflows of the run', async () => {
    const queue = eventQueue();
    const { out, text } = captureSink();
    const run = followRun(queue.iterator, ROOT, out);

    queue.push(created(SUB, ROOT));
    queue.push(delta(SUB, 'sub says hi'));
    queue.push(delta('stranger-1', 'never printed'));
    queue.push(updated(ROOT, WorkflowState.Completed, 'end'));

    const outcome = await run;
    expect(outcome.status).toBe(WorkflowState.Completed);
    // Sub-workflow tokens carry the assistant label line behind the depth rail.
    expect(text()).toContain('│ assistant:\n│ sub says hi');
    expect(text()).not.toContain('never printed');
  });

  it('collects streamed message ids from the run family only', async () => {
    const queue = eventQueue();
    const { out } = captureSink();
    const streamedMessageIds = new Set<string>();
    const run = followRun(queue.iterator, ROOT, out, { streamedMessageIds });

    queue.push(created(SUB, ROOT));
    queue.push(streamStart(SUB, 'msg-sub'));
    queue.push(delta(SUB, 'hi', 'msg-sub'));
    queue.push(streamStart('stranger-1', 'msg-stranger'));
    queue.push(updated(ROOT, WorkflowState.Completed, 'end'));

    await run;
    expect(streamedMessageIds).toEqual(new Set(['msg-sub']));
  });

  it('renders streamed tool calls live and records their ids for document dedupe', async () => {
    const queue = eventQueue();
    const { out, text } = captureSink();
    const streamedToolCallIds = new Set<string>();
    const run = followRun(queue.iterator, ROOT, out, { streamedToolCallIds });

    queue.push(updated(ROOT, WorkflowState.Running, 'thinking'));
    queue.push(delta(ROOT, 'Let me check.'));
    queue.push(toolCall(ROOT, 'toolu-1', 'weather_lookup', { city: 'Tokyo' }));
    queue.push(updated(ROOT, WorkflowState.Completed, 'end'));

    await run;
    expect(text()).toContain('⚒ weather_lookup {"city":"Tokyo"}');
    expect(streamedToolCallIds.has('toolu-1')).toBe(true);
  });

  it('suppresses streamed tool calls of hidden sub-workflows', async () => {
    const queue = eventQueue();
    const { out, text } = captureSink();
    const run = followRun(queue.iterator, ROOT, out, { visibleWorkflowIds: new Set<string>() });

    queue.push(created(SUB, ROOT));
    queue.push(toolCall(SUB, 'toolu-2', 'hidden_tool', {}));
    queue.push(updated(ROOT, WorkflowState.Completed, 'end'));

    await run;
    expect(text()).not.toContain('hidden_tool');
  });

  it('re-arms the idle prompt for multi-prompt sequences while the root stays parked', async () => {
    // connect_github shape: the root waits on a callback the whole time while
    // sub-workflows ask one question after another — answering the first ask
    // must lead to the second being discovered, with no root status change.
    // Trailing re-arms (armed while the final events are in flight) resolve
    // via abort — the regression is the second discovery never happening.
    const queue = eventQueue();
    const { out } = captureSink();
    let answeredPrompts = 0;

    const run = followRun(queue.iterator, ROOT, out, {
      onIdle: (signal) =>
        new Promise<IdleOutcome>((resolve) => {
          answeredPrompts += 1;
          if (answeredPrompts === 1) {
            // First ask answered — its workflow resumes, the root stays waiting.
            queueMicrotask(() => queue.push(updated(SUB, WorkflowState.Completed, 'end', ROOT)));
            resolve('answered');
            return;
          }
          if (answeredPrompts === 2) {
            // Second ask discovered and answered — the run finishes.
            queueMicrotask(() => queue.push(updated(ROOT, WorkflowState.Completed, 'end')));
            resolve('answered');
            return;
          }
          signal.addEventListener('abort', () => resolve('resumed'), { once: true });
        }),
    });

    queue.push(created(SUB, ROOT));
    queue.push(updated(ROOT, WorkflowState.Waiting, 'connecting'));

    const outcome = await run;
    expect(outcome.status).toBe(WorkflowState.Completed);
    expect(answeredPrompts).toBeGreaterThanOrEqual(2);
  });

  it('aborts a re-armed prompt when the root resumes, without arming again', async () => {
    const queue = eventQueue();
    const { out } = captureSink();
    let idleCalls = 0;

    const run = followRun(queue.iterator, ROOT, out, {
      onIdle: (signal) =>
        new Promise<IdleOutcome>((resolve) => {
          idleCalls += 1;
          if (idleCalls === 1) {
            // The answer resumes the root itself.
            queueMicrotask(() => {
              queue.push(updated(ROOT, WorkflowState.Running, 'resumed'));
              queue.push(updated(ROOT, WorkflowState.Completed, 'end'));
            });
            resolve('answered');
            return;
          }
          // A transient re-arm may race the resume events — it must be
          // aborted by them, never left dangling.
          signal.addEventListener('abort', () => resolve('resumed'), { once: true });
        }),
    });

    queue.push(updated(ROOT, WorkflowState.Waiting, 'ask'));

    const outcome = await run;
    expect(outcome.status).toBe(WorkflowState.Completed);
    expect(idleCalls).toBeLessThanOrEqual(2);
  });

  it('discovers sub-workflows from workflow.updated when the created event was missed', async () => {
    const queue = eventQueue();
    const { out, text } = captureSink();
    const run = followRun(queue.iterator, ROOT, out);

    // No workflow.created — attaching mid-run, or the server never emitted it.
    queue.push(updated(SUB, WorkflowState.Running, 'ready', ROOT));
    queue.push(delta(SUB, 'sub says hi'));
    queue.push(updated(ROOT, WorkflowState.Completed, 'end'));

    const outcome = await run;
    expect(outcome.status).toBe(WorkflowState.Completed);
    expect(text()).toContain('sub says hi');
  });

  it('starts the prompt immediately when attaching to an already-waiting run', async () => {
    const queue = eventQueue();
    const { out, text } = captureSink();
    let promptStarted = false;

    const run = followRun(queue.iterator, ROOT, out, {
      initiallyIdle: true,
      onIdle: (signal, onPromptWorkflow) => {
        promptStarted = true;
        onPromptWorkflow(ROOT);
        return new Promise<IdleOutcome>((resolve) =>
          signal.addEventListener('abort', () => resolve('external'), { once: true }),
        );
      },
    });

    // No waiting event needed — the run was already parked when we attached.
    // Studio answers; the root resumes and completes.
    queue.push(updated(ROOT, WorkflowState.Running, 'resumed'));
    queue.push(updated(ROOT, WorkflowState.Completed, 'end'));

    const outcome = await run;
    expect(promptStarted).toBe(true);
    expect(outcome.status).toBe(WorkflowState.Completed);
    expect(text()).toContain('answered in Studio');
  });

  it('ends the follow when a stream.reset reveals the run already reached a terminal state', async () => {
    const queue = eventQueue();
    const { out } = captureSink();
    const run = followRun(queue.iterator, ROOT, out, {
      onStreamReset: () => Promise.resolve(WorkflowState.Failed),
    });

    queue.push(updated(ROOT, WorkflowState.Running, 'start'));
    // Events were lost — the terminal update fell into the gap.
    queue.push(reset());

    const outcome = await run;
    expect(outcome.status).toBe(WorkflowState.Failed);
  });

  it('keeps following when a stream.reset finds the run still running', async () => {
    const queue = eventQueue();
    const { out } = captureSink();
    const run = followRun(queue.iterator, ROOT, out, {
      onStreamReset: () => Promise.resolve(WorkflowState.Running),
    });

    queue.push(reset());
    queue.push(updated(ROOT, WorkflowState.Completed, 'end'));

    const outcome = await run;
    expect(outcome.status).toBe(WorkflowState.Completed);
  });
});
