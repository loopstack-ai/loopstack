import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject } from 'rxjs';
import type { ClientMessage } from '@loopstack/contracts/events';
import { SSE_STREAM_OPTIONS, SseStreamOptionsInterface } from '../interfaces/index.js';

/**
 * A single frame on the event stream. Every frame carries an explicit `id`
 * (Nest would otherwise auto-assign its own counter and corrupt the client's
 * resume cursor): buffered events carry their monotonic sequence, and
 * synthetic frames (`stream.reset`, heartbeats) carry the connection's
 * current cursor.
 */
export interface SseStreamEvent {
  id: string;
  message: ClientMessage;
}

export interface SseSubscription {
  connectionId: string;
  subject: Subject<SseStreamEvent>;
  /** Frames to deliver before live events: the replayed tail, or a `stream.reset`. */
  replay: SseStreamEvent[];
  /** The connection's resume cursor — the highest sequence the client is current to. */
  cursor: () => string;
}

interface RegisterConnectionOptions {
  lastEventId?: string;
  workflowId?: string;
}

interface SseConnection {
  id: string;
  workerId: string;
  userId: string;
  workflowId?: string;
  lastDeliveredSeq: number;
  subject: Subject<SseStreamEvent>;
}

interface BufferedEvent {
  seq: number;
  message: ClientMessage;
  bufferedAt: number;
}

interface EventBuffer {
  nextSeq: number;
  events: BufferedEvent[];
}

const DEFAULT_BUFFER_SIZE = 1000;
const DEFAULT_BUFFER_TTL_MS = 5 * 60 * 1000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 25 * 1000;

let connectionIdCounter = 0;

@Injectable()
export class SseEventService implements OnModuleDestroy {
  private readonly logger = new Logger(SseEventService.name);
  private connections: Map<string, SseConnection[]> = new Map();
  private buffers: Map<string, EventBuffer> = new Map();
  private readonly sweepTimer: NodeJS.Timeout;

  readonly bufferSize: number;
  readonly bufferTtlMs: number;
  readonly heartbeatIntervalMs: number;

  constructor(@Optional() @Inject(SSE_STREAM_OPTIONS) options?: SseStreamOptionsInterface) {
    this.bufferSize = options?.bufferSize ?? DEFAULT_BUFFER_SIZE;
    this.bufferTtlMs = options?.bufferTtlMs ?? DEFAULT_BUFFER_TTL_MS;
    this.heartbeatIntervalMs = options?.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;

    this.sweepTimer = setInterval(() => this.sweepBuffers(), this.bufferTtlMs);
    this.sweepTimer.unref?.();
  }

  onModuleDestroy(): void {
    clearInterval(this.sweepTimer);
  }

  private getConnectionKey(workerId: string, userId: string): string {
    return `worker:${workerId}-user:${userId}`;
  }

  registerConnection(workerId: string, userId: string, options: RegisterConnectionOptions = {}): SseSubscription {
    const key = this.getConnectionKey(workerId, userId);
    const subject = new Subject<SseStreamEvent>();
    const id = String(++connectionIdCounter);

    this.logger.debug(`Registering SSE connection ${id} for user ${userId} on worker ${workerId}`);

    if (!this.connections.has(key)) {
      this.connections.set(key, []);
    }

    const replay = this.buildReplay(key, workerId, userId, options);

    // After the replay (or a reset followed by a refetch) the client is
    // current up to the latest assigned sequence.
    const latestSeq = (this.buffers.get(key)?.nextSeq ?? 1) - 1;
    const connection: SseConnection = {
      id,
      workerId,
      userId,
      workflowId: options.workflowId,
      lastDeliveredSeq: latestSeq,
      subject,
    };
    this.connections.get(key)!.push(connection);

    return {
      connectionId: id,
      subject,
      replay,
      cursor: () => String(connection.lastDeliveredSeq),
    };
  }

  private buildReplay(
    key: string,
    workerId: string,
    userId: string,
    options: RegisterConnectionOptions,
  ): SseStreamEvent[] {
    if (options.lastEventId === undefined) return [];

    const lastSeq = Number(options.lastEventId);
    const buffer = this.buffers.get(key);
    if (buffer) this.trimBuffer(buffer);

    // The sequence counter, not the buffer content, decides resumability:
    // a client that saw the latest assigned seq missed nothing even if the
    // buffer has been trimmed since.
    const nextSeq = buffer?.nextSeq ?? 1;
    const oldestSeq = buffer?.events[0]?.seq ?? nextSeq;
    const resumable = Number.isInteger(lastSeq) && lastSeq < nextSeq && lastSeq >= oldestSeq - 1;

    if (!resumable) {
      this.logger.debug(`SSE resume from event ${options.lastEventId} not possible for ${key} — sending stream.reset`);
      return [{ id: String(nextSeq - 1), message: { type: 'stream.reset', userId, workerId } }];
    }

    if (!buffer) return [];

    return buffer.events
      .filter((event) => event.seq > lastSeq && this.matchesFilter(options.workflowId, event.message))
      .map((event) => ({ id: String(event.seq), message: event.message }));
  }

  unregisterConnection(workerId: string, userId: string, connectionId?: string): void {
    const key = this.getConnectionKey(workerId, userId);
    const connections = this.connections.get(key);

    if (!connections) return;

    if (connectionId) {
      const index = connections.findIndex((c) => c.id === connectionId);
      if (index !== -1) {
        this.logger.debug(`Unregistering SSE connection ${connectionId} for user ${userId} on worker ${workerId}`);
        connections[index].subject.complete();
        connections.splice(index, 1);
      }
    } else {
      const connection = connections.pop();
      if (connection) {
        this.logger.debug(`Unregistering SSE connection ${connection.id} for user ${userId} on worker ${workerId}`);
        connection.subject.complete();
      }
    }

    if (connections.length === 0) {
      this.connections.delete(key);
    }
  }

  private matchesFilter(workflowId: string | undefined, message: ClientMessage): boolean {
    if (!workflowId) return true;
    if (message.type === 'stream.reset') return true;
    if ('workflowId' in message) return message.workflowId === workflowId;
    return true;
  }

  private appendToBuffer(key: string, message: ClientMessage): number {
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = { nextSeq: 1, events: [] };
      this.buffers.set(key, buffer);
    }

    const seq = buffer.nextSeq++;
    buffer.events.push({ seq, message, bufferedAt: Date.now() });
    this.trimBuffer(buffer);
    return seq;
  }

  private trimBuffer(buffer: EventBuffer): void {
    const minBufferedAt = Date.now() - this.bufferTtlMs;
    while (
      buffer.events.length > this.bufferSize ||
      (buffer.events.length > 0 && buffer.events[0].bufferedAt < minBufferedAt)
    ) {
      buffer.events.shift();
    }
  }

  private sweepBuffers(): void {
    // Only events are evicted — the `nextSeq` counter shell must survive so
    // a returning client whose cursor matches the latest sequence can resume
    // without a reset.
    for (const buffer of this.buffers.values()) {
      this.trimBuffer(buffer);
    }
  }

  @OnEvent('client.message')
  handleClientMessage(payload: ClientMessage): void {
    if (!payload.userId || !payload.workerId) {
      this.logger.warn(`Client message missing userId or workerId:`, payload);
      return;
    }

    const key = this.getConnectionKey(payload.workerId, payload.userId);
    const seq = this.appendToBuffer(key, payload);
    const event: SseStreamEvent = { id: String(seq), message: payload };

    const connections = this.connections.get(key);
    if (!connections || connections.length === 0) {
      this.logger.debug(`No active SSE connection found for user ${payload.userId} on worker ${payload.workerId}`);
      return;
    }

    for (const connection of connections) {
      // The cursor advances past filtered events too — resume replays apply
      // the same filter, so the client misses nothing it would have received.
      connection.lastDeliveredSeq = seq;
      if (!this.matchesFilter(connection.workflowId, payload)) continue;
      try {
        connection.subject.next(event);
      } catch (error) {
        this.logger.error(
          `Error sending message to connection ${connection.id} for user ${payload.userId} on worker ${payload.workerId}:`,
          error,
        );
      }
    }
  }

  getConnectionCount(): number {
    let count = 0;
    for (const connections of this.connections.values()) {
      count += connections.length;
    }
    return count;
  }

  getActiveConnections(): string[] {
    const result: string[] = [];
    for (const [key, connections] of this.connections.entries()) {
      for (const conn of connections) {
        result.push(`${key}:${conn.id}`);
      }
    }
    return result;
  }

  getBufferStats(): { bufferedKeys: number; bufferedEvents: number } {
    let bufferedEvents = 0;
    for (const buffer of this.buffers.values()) {
      bufferedEvents += buffer.events.length;
    }
    return { bufferedKeys: this.buffers.size, bufferedEvents };
  }
}
