import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientMessage } from '@loopstack/contracts/events';
import { SseEventService, SseStreamEvent } from './sse-event.service.js';

const WORKER = 'worker-1';
const USER = 'user-1';

function documentCreated(workflowId: string, userId = USER): ClientMessage {
  return { type: 'document.created', workflowId, userId, workerId: WORKER };
}

function secretUpserted(workspaceId: string): ClientMessage {
  return { type: 'secret.upserted', workspaceId, userId: USER, workerId: WORKER };
}

function collect(subscription: { subject: { subscribe: (fn: (e: SseStreamEvent) => void) => unknown } }) {
  const received: SseStreamEvent[] = [];
  subscription.subject.subscribe((event) => received.push(event));
  return received;
}

describe('SseEventService', () => {
  let service: SseEventService;

  beforeEach(() => {
    service = new SseEventService({ bufferSize: 3, bufferTtlMs: 60_000, heartbeatIntervalMs: 25_000 });
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  it('assigns monotonic ids per connection key', () => {
    const subscription = service.registerConnection(WORKER, USER);
    const received = collect(subscription);

    service.handleClientMessage(documentCreated('wf-1'));
    service.handleClientMessage(documentCreated('wf-2'));

    expect(received.map((e) => e.id)).toEqual(['1', '2']);
  });

  it('keeps sequences independent between connection keys', () => {
    service.handleClientMessage(documentCreated('wf-1'));
    service.handleClientMessage(documentCreated('wf-2'));
    service.handleClientMessage(documentCreated('wf-other', 'user-2'));

    const resumed = service.registerConnection(WORKER, 'user-2', { lastEventId: '0' });
    expect(resumed.replay.map((e) => e.id)).toEqual(['1']);
  });

  it('replays events missed while disconnected, without duplicates', () => {
    const first = service.registerConnection(WORKER, USER);
    const received = collect(first);
    service.handleClientMessage(documentCreated('wf-1'));
    expect(received).toHaveLength(1);
    service.unregisterConnection(WORKER, USER, first.connectionId);

    service.handleClientMessage(documentCreated('wf-2'));
    service.handleClientMessage(documentCreated('wf-3'));

    const resumed = service.registerConnection(WORKER, USER, { lastEventId: '1' });
    expect(resumed.replay.map((e) => e.id)).toEqual(['2', '3']);
    expect(resumed.replay.map((e) => (e.message.type === 'document.created' ? e.message.workflowId : null))).toEqual([
      'wf-2',
      'wf-3',
    ]);
  });

  it('returns an empty replay when nothing was missed', () => {
    service.handleClientMessage(documentCreated('wf-1'));
    const resumed = service.registerConnection(WORKER, USER, { lastEventId: '1' });
    expect(resumed.replay).toEqual([]);
  });

  it('sends stream.reset when the requested tail was evicted by the size cap', () => {
    for (let i = 1; i <= 5; i++) {
      service.handleClientMessage(documentCreated(`wf-${i}`));
    }

    const stale = service.registerConnection(WORKER, USER, { lastEventId: '1' });
    expect(stale.replay).toHaveLength(1);
    expect(stale.replay[0].id).toBe('5');
    expect(stale.replay[0].message.type).toBe('stream.reset');

    const fresh = service.registerConnection(WORKER, USER, { lastEventId: '2' });
    expect(fresh.replay.map((e) => e.id)).toEqual(['3', '4', '5']);
  });

  it('sends stream.reset for unknown or malformed cursors', () => {
    service.handleClientMessage(documentCreated('wf-1'));

    expect(service.registerConnection(WORKER, USER, { lastEventId: '999' }).replay[0]?.message.type).toBe(
      'stream.reset',
    );
    expect(service.registerConnection(WORKER, USER, { lastEventId: 'abc' }).replay[0]?.message.type).toBe(
      'stream.reset',
    );
    expect(service.registerConnection(WORKER, 'user-never-seen', { lastEventId: '1' }).replay[0]?.message.type).toBe(
      'stream.reset',
    );
  });

  it('evicts events past the TTL but resumes cleanly when nothing was missed', () => {
    vi.useFakeTimers();
    const ttlService = new SseEventService({ bufferSize: 100, bufferTtlMs: 1_000, heartbeatIntervalMs: 25_000 });

    ttlService.handleClientMessage(documentCreated('wf-1'));
    vi.advanceTimersByTime(2_000);

    // Cursor at the latest seq: buffer is empty but nothing was missed.
    expect(ttlService.registerConnection(WORKER, USER, { lastEventId: '1' }).replay).toEqual([]);
    // Cursor before the evicted event: the tail is gone — reset.
    expect(ttlService.registerConnection(WORKER, USER, { lastEventId: '0' }).replay[0]?.message.type).toBe(
      'stream.reset',
    );

    ttlService.onModuleDestroy();
  });

  it('filters live events by workflowId but passes non-workflow-scoped events', () => {
    const subscription = service.registerConnection(WORKER, USER, { workflowId: 'wf-1' });
    const received = collect(subscription);

    service.handleClientMessage(documentCreated('wf-1'));
    service.handleClientMessage(documentCreated('wf-2'));
    service.handleClientMessage(secretUpserted('ws-1'));

    expect(received.map((e) => e.message.type)).toEqual(['document.created', 'secret.upserted']);
    expect(received[0].message).toMatchObject({ workflowId: 'wf-1' });
  });

  it('applies the workflowId filter to replayed events as well', () => {
    service.handleClientMessage(documentCreated('wf-1'));
    service.handleClientMessage(documentCreated('wf-2'));

    const resumed = service.registerConnection(WORKER, USER, { lastEventId: '0', workflowId: 'wf-2' });
    expect(resumed.replay.map((e) => e.id)).toEqual(['2']);
  });

  it('completes the subject and cleans up on unregister', () => {
    const subscription = service.registerConnection(WORKER, USER);
    let completed = false;
    subscription.subject.subscribe({ complete: () => (completed = true) });

    service.unregisterConnection(WORKER, USER, subscription.connectionId);

    expect(completed).toBe(true);
    expect(service.getConnectionCount()).toBe(0);
  });

  it('reports buffer stats', () => {
    service.handleClientMessage(documentCreated('wf-1'));
    service.handleClientMessage(documentCreated('wf-other', 'user-2'));

    expect(service.getBufferStats()).toEqual({ bufferedKeys: 2, bufferedEvents: 2 });
  });
});
