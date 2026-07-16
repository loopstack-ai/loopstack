import { afterEach, describe, expect, it } from 'vitest';
import type { ClientMessage } from '@loopstack/contracts/events';
import { LoopstackStream } from './stream.js';

const URL_BASE = 'http://loopstack.test';

function sseFrame(id: number, message: object): string {
  return `id: ${id}\ndata: ${JSON.stringify(message)}\n\n`;
}

function documentCreated(workflowId: string): object {
  return { type: 'document.created', workflowId, userId: 'u1', workerId: 'w1' };
}

interface MockConnection {
  push: (text: string) => void;
  end: () => void;
  request: { url: string; headers: Record<string, string> };
}

/** A scripted SSE server: every fetch yields a controllable connection. */
function createMockServer() {
  const connections: MockConnection[] = [];
  const waiters: Array<(conn: MockConnection) => void> = [];

  const fetchFn = (async (url: URL | RequestInfo, init?: RequestInit) => {
    const encoder = new TextEncoder();
    let controllerRef: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef = controller;
      },
    });
    const abort = () => {
      try {
        controllerRef.error(new DOMException('aborted', 'AbortError'));
      } catch {
        // already closed
      }
    };
    init?.signal?.addEventListener('abort', abort);
    const connection: MockConnection = {
      push: (text) => controllerRef.enqueue(encoder.encode(text)),
      end: () => {
        try {
          controllerRef.close();
        } catch {
          // already closed
        }
      },
      request: { url: String(url), headers: (init?.headers ?? {}) as Record<string, string> },
    };
    connections.push(connection);
    waiters.splice(0).forEach((resolve) => resolve(connection));
    return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  }) as typeof fetch;

  return {
    fetchFn,
    connections,
    nextConnection: (): Promise<MockConnection> => new Promise((resolve) => waiters.push(resolve)),
  };
}

function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - started > timeoutMs) return reject(new Error('waitFor timed out'));
      setTimeout(tick, 5);
    };
    tick();
  });
}

let stream: LoopstackStream | undefined;
afterEach(() => stream?.close());

describe('LoopstackStream', () => {
  it('opens on first subscriber, dispatches typed events, tracks lastEventId', async () => {
    const server = createMockServer();
    stream = new LoopstackStream({ url: URL_BASE, fetch: server.fetchFn });

    const received: ClientMessage[] = [];
    const connPromise = server.nextConnection();
    stream.on('document.created', (message) => received.push(message));
    const conn = await connPromise;

    conn.push(sseFrame(1, documentCreated('wf-1')));
    conn.push(sseFrame(2, documentCreated('wf-2')));
    await waitFor(() => received.length === 2);

    expect(received[0]).toMatchObject({ type: 'document.created', workflowId: 'wf-1' });
    expect(stream.lastEventId).toBe('2');
    expect(stream.status).toBe('open');
  });

  it('does not connect before the first subscriber, closes after the last unsubscribes', async () => {
    const server = createMockServer();
    stream = new LoopstackStream({ url: URL_BASE, fetch: server.fetchFn });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(server.connections).toHaveLength(0);

    const connPromise = server.nextConnection();
    const unsubscribe = stream.on('document.created', () => {});
    await connPromise;
    expect(server.connections).toHaveLength(1);

    unsubscribe();
    await waitFor(() => stream!.status === 'idle');
  });

  it('reconnects with Last-Event-ID after the connection drops', async () => {
    const server = createMockServer();
    stream = new LoopstackStream({ url: URL_BASE, fetch: server.fetchFn, maxRetryDelayMs: 20 });

    const received: ClientMessage[] = [];
    const firstConn = server.nextConnection();
    stream.on('document.created', (message) => received.push(message));
    const conn1 = await firstConn;
    conn1.push(sseFrame(5, documentCreated('wf-1')));
    await waitFor(() => received.length === 1);

    const secondConn = server.nextConnection();
    conn1.end();
    const conn2 = await secondConn;

    expect(conn2.request.headers['Last-Event-ID']).toBe('5');
    conn2.push(sseFrame(6, documentCreated('wf-2')));
    await waitFor(() => received.length === 2);
  });

  it('sends the auth token and workflow filter', async () => {
    const server = createMockServer();
    stream = new LoopstackStream({ url: URL_BASE, token: 'lsk_x', workflowId: 'wf-9', fetch: server.fetchFn });

    const connPromise = server.nextConnection();
    stream.onAny(() => {});
    const conn = await connPromise;

    expect(conn.request.headers.Authorization).toBe('Bearer lsk_x');
    expect(conn.request.url).toContain('workflowId=wf-9');
  });

  it('ignores ping frames but lets them advance the cursor', async () => {
    const server = createMockServer();
    stream = new LoopstackStream({ url: URL_BASE, fetch: server.fetchFn });

    const received: unknown[] = [];
    const connPromise = server.nextConnection();
    stream.onAny((message) => received.push(message));
    const conn = await connPromise;

    conn.push('event: ping\nid: 9\ndata: ping\n\n');
    await waitFor(() => stream!.lastEventId === '9');
    expect(received).toHaveLength(0);
  });

  it('passes unknown event types to onAny as { type, raw }', async () => {
    const server = createMockServer();
    stream = new LoopstackStream({ url: URL_BASE, fetch: server.fetchFn });

    const received: unknown[] = [];
    const connPromise = server.nextConnection();
    stream.onAny((message) => received.push(message));
    const conn = await connPromise;

    conn.push(sseFrame(1, { type: 'future.event', userId: 'u1', workerId: 'w1', shiny: true }));
    await waitFor(() => received.length === 1);
    expect(received[0]).toMatchObject({ type: 'future.event', raw: { shiny: true, type: 'future.event' } });
  });

  it('reconnects when the heartbeat watchdog fires', async () => {
    const server = createMockServer();
    stream = new LoopstackStream({
      url: URL_BASE,
      fetch: server.fetchFn,
      heartbeatTimeoutMs: 30,
      maxRetryDelayMs: 10,
    });

    const first = server.nextConnection();
    stream.on('document.created', () => {});
    await first;

    // No frames arrive — the watchdog must abort and the loop must reconnect.
    await waitFor(() => server.connections.length >= 2, 3000);
  });

  it('filters the async iterator by workflowId and stops on break', async () => {
    const server = createMockServer();
    stream = new LoopstackStream({ url: URL_BASE, fetch: server.fetchFn });

    const connPromise = server.nextConnection();
    const iterator = stream.events({ workflowId: 'wf-1' });
    const collected: string[] = [];
    const consume = (async () => {
      for await (const message of iterator) {
        collected.push('workflowId' in message ? (message.workflowId as string) : message.type);
        if (collected.length === 2) break;
      }
    })();

    const conn = await connPromise;
    conn.push(sseFrame(1, documentCreated('wf-1')));
    conn.push(sseFrame(2, documentCreated('wf-other')));
    conn.push(sseFrame(3, documentCreated('wf-1')));
    await consume;

    expect(collected).toEqual(['wf-1', 'wf-1']);
    await waitFor(() => stream!.status === 'idle');
  });

  it('stops on a fatal status, surfaces it via onError, and rejects events()', async () => {
    let fetchCalls = 0;
    const fetchFn = (async () => {
      fetchCalls++;
      return new Response('unauthorized', { status: 401 });
    }) as typeof fetch;
    stream = new LoopstackStream({ url: URL_BASE, fetch: fetchFn, maxRetryDelayMs: 20 });

    const errors: Array<{ status?: number }> = [];
    stream.onError((e) => errors.push(e as unknown as { status?: number }));

    const iterator = stream.events();
    await expect(iterator.next()).rejects.toMatchObject({ status: 401 });

    await waitFor(() => errors.length === 1);
    expect(errors[0].status).toBe(401);
    await waitFor(() => stream!.status === 'closed');

    // No reconnect attempts after a fatal status.
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(fetchCalls).toBe(1);
  });

  it('invokes an onError handler added after the fatal error with the stored error', async () => {
    const fetchFn = (async () => new Response('forbidden', { status: 403 })) as typeof fetch;
    stream = new LoopstackStream({ url: URL_BASE, fetch: fetchFn });

    // Retain via a plain subscriber so the loop runs and fails.
    stream.on('document.created', () => {});
    await waitFor(() => stream!.status === 'closed');

    const late: Array<{ status?: number }> = [];
    stream.onError((e) => late.push(e as unknown as { status?: number }));
    expect(late).toHaveLength(1);
    expect(late[0].status).toBe(403);
  });

  it('reconnects after a retryable status (503)', async () => {
    const server = createMockServer();
    let call = 0;
    const fetchFn = (async (url: URL | RequestInfo, init?: RequestInit) => {
      call++;
      if (call === 1) return new Response('unavailable', { status: 503 });
      return server.fetchFn(url as URL, init);
    }) as typeof fetch;
    stream = new LoopstackStream({ url: URL_BASE, fetch: fetchFn, maxRetryDelayMs: 20 });

    const received: ClientMessage[] = [];
    stream.on('document.created', (message) => received.push(message));

    await waitFor(() => call >= 2);
    const conn = server.connections[server.connections.length - 1];
    conn.push(sseFrame(1, documentCreated('wf-1')));
    await waitFor(() => received.length === 1);
    expect(stream.status).toBe('open');
  });
});
