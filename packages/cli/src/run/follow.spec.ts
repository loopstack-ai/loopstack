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

const updated = (workflowId: string, status: WorkflowState, place?: string): ClientMessage =>
  ({ type: 'workflow.updated', workflowId, status, place }) as unknown as ClientMessage;

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
});
