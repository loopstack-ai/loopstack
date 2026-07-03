import { ClientMessageSchema } from '@loopstack/contracts/events';
import type { ClientMessage, ClientMessageType } from '@loopstack/contracts/events';
import { LoopstackApiError } from '../http.js';
import type { LoopstackClientConfig } from '../http.js';
import { createSseParser } from './sse-parser.js';

export interface LoopstackStreamConfig extends Pick<LoopstackClientConfig, 'url' | 'token' | 'fetch' | 'credentials'> {
  /** Server-side filter: only receive events for this workflow run. */
  workflowId?: string;
  /** Resume cursor to send on the first connection. */
  lastEventId?: string;
  /** Reconnect if no frame (including heartbeats) arrives within this window. Default 60 s. */
  heartbeatTimeoutMs?: number;
  /** Upper bound for the reconnect backoff. Default 10 s. */
  maxRetryDelayMs?: number;
}

export type StreamStatus = 'idle' | 'connecting' | 'open' | 'closed';

/** A message whose `type` is not (yet) part of the shared contract. */
export interface UnknownStreamMessage {
  type: string;
  raw: unknown;
}

type MessageHandler<T extends ClientMessage = ClientMessage> = (message: T) => void;
type AnyHandler = (message: ClientMessage | UnknownStreamMessage) => void;
type StatusHandler = (status: StreamStatus) => void;

const INITIAL_RETRY_DELAY_MS = 500;

function matchesWorkflow(message: ClientMessage, workflowId: string | undefined): boolean {
  if (!workflowId) return true;
  if (message.type === 'stream.reset') return true;
  if ('workflowId' in message) return message.workflowId === workflowId;
  return true;
}

/**
 * Ref-counted live event stream over the backend's SSE endpoint. The first
 * subscriber opens the connection, the last one closes it. Reconnects with
 * exponential backoff and resumes via `Last-Event-ID`; a heartbeat watchdog
 * detects dead connections that never error.
 */
export class LoopstackStream {
  private readonly handlers = new Map<ClientMessageType, Set<MessageHandler>>();
  private readonly anyHandlers = new Set<AnyHandler>();
  private readonly statusHandlers = new Set<StatusHandler>();
  private subscriberCount = 0;
  private abortController: AbortController | undefined;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private closed = false;
  private currentStatus: StreamStatus = 'idle';

  /** The highest event id received — the resume cursor. */
  lastEventId: string | undefined;

  constructor(private readonly config: LoopstackStreamConfig) {
    this.lastEventId = config.lastEventId;
  }

  get status(): StreamStatus {
    return this.currentStatus;
  }

  /** Subscribe to one event type. Returns an unsubscribe function. */
  on<T extends ClientMessageType>(type: T, handler: MessageHandler<Extract<ClientMessage, { type: T }>>): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler as MessageHandler);
    this.retain();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.handlers.get(type)?.delete(handler as MessageHandler);
      this.release();
    };
  }

  /** Subscribe to every message, including unknown event types. */
  onAny(handler: AnyHandler): () => void {
    this.anyHandlers.add(handler);
    this.retain();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.anyHandlers.delete(handler);
      this.release();
    };
  }

  /** Observe connection status transitions (does not open the stream by itself). */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Async iteration over live events, optionally narrowed to one workflow.
   * `break`ing out of the loop unsubscribes.
   */
  events(options: { workflowId?: string } = {}): AsyncIterableIterator<ClientMessage> {
    const queue: ClientMessage[] = [];
    let notify: (() => void) | undefined;
    let done = false;

    const unsubscribe = this.onAny((message) => {
      if (!('userId' in message)) return; // unknown message types are not iterated
      if (!matchesWorkflow(message, options.workflowId)) return;
      queue.push(message);
      notify?.();
    });

    const iterator: AsyncIterableIterator<ClientMessage> = {
      [Symbol.asyncIterator]: () => iterator,
      next: async () => {
        while (queue.length === 0 && !done) {
          await new Promise<void>((resolve) => (notify = resolve));
          notify = undefined;
        }
        if (queue.length === 0) return { done: true, value: undefined };
        return { done: false, value: queue.shift()! };
      },
      return: async () => {
        done = true;
        unsubscribe();
        notify?.();
        return { done: true, value: undefined };
      },
    };
    return iterator;
  }

  /** Permanently close the stream and drop all subscriptions. */
  close(): void {
    this.closed = true;
    this.handlers.clear();
    this.anyHandlers.clear();
    this.subscriberCount = 0;
    this.abortController?.abort();
    this.clearWatchdog();
    this.setStatus('closed');
  }

  private retain(): void {
    this.subscriberCount++;
    if (this.subscriberCount === 1 && !this.running && !this.closed) {
      void this.runLoop();
    }
  }

  private release(): void {
    this.subscriberCount = Math.max(0, this.subscriberCount - 1);
    if (this.subscriberCount === 0) {
      this.abortController?.abort();
    }
  }

  private setStatus(status: StreamStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    for (const handler of this.statusHandlers) handler(status);
  }

  private buildUrl(): URL {
    const url = new URL(`${this.config.url.replace(/\/+$/, '')}/api/v1/sse/stream`);
    if (this.config.workflowId) url.searchParams.set('workflowId', this.config.workflowId);
    return url;
  }

  private async runLoop(): Promise<void> {
    this.running = true;
    const fetchFn = this.config.fetch ?? fetch;
    let attempt = 0;

    while (!this.closed && this.subscriberCount > 0) {
      this.abortController = new AbortController();
      const { signal } = this.abortController;

      try {
        this.setStatus('connecting');
        const headers: Record<string, string> = { Accept: 'text/event-stream' };
        if (this.config.token) headers.Authorization = `Bearer ${this.config.token}`;
        if (this.lastEventId !== undefined) headers['Last-Event-ID'] = this.lastEventId;

        const response = await fetchFn(this.buildUrl(), {
          headers,
          credentials: this.config.credentials ?? 'include',
          signal,
        });
        if (!response.ok || !response.body) {
          throw new LoopstackApiError(response.status, undefined, `Event stream failed with status ${response.status}`);
        }

        this.setStatus('open');
        attempt = 0;
        this.resetWatchdog();

        const parser = createSseParser((frame) => {
          this.resetWatchdog();
          if (frame.id !== undefined && frame.id !== '') this.lastEventId = frame.id;
          if (frame.event === 'ping') return;
          if (!frame.data) return;
          this.dispatch(frame.data);
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parser.feed(decoder.decode(value, { stream: true }));
        }
      } catch {
        // Aborts and network failures both land here; the loop condition decides.
      }

      this.clearWatchdog();
      if (this.currentStatus === 'open') this.setStatus('connecting');

      if (this.closed || this.subscriberCount === 0) break;

      attempt++;
      const cappedDelay = Math.min(this.config.maxRetryDelayMs ?? 10_000, INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1));
      const jitteredDelay = cappedDelay * (0.8 + Math.random() * 0.4);
      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }

    this.running = false;
    this.setStatus(this.closed ? 'closed' : 'idle');
  }

  private dispatch(data: string): void {
    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }

    const result = ClientMessageSchema.safeParse(payload);
    if (result.success) {
      const message = result.data;
      for (const handler of this.handlers.get(message.type) ?? []) handler(message);
      for (const handler of this.anyHandlers) handler(message);
      return;
    }

    // Forward compatibility: unknown event types reach onAny instead of throwing.
    const type =
      payload && typeof payload === 'object' && 'type' in payload && typeof payload.type === 'string'
        ? payload.type
        : 'unknown';
    for (const handler of this.anyHandlers) handler({ type, raw: payload });
  }

  private resetWatchdog(): void {
    this.clearWatchdog();
    this.watchdog = setTimeout(() => {
      // No frames within the window — assume the connection is dead and force
      // a reconnect through the run loop.
      this.abortController?.abort();
    }, this.config.heartbeatTimeoutMs ?? 60_000);
    this.watchdog.unref?.();
  }

  private clearWatchdog(): void {
    if (this.watchdog !== undefined) clearTimeout(this.watchdog);
    this.watchdog = undefined;
  }
}

export function createStream(config: LoopstackStreamConfig): LoopstackStream {
  return new LoopstackStream(config);
}
