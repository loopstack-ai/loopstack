import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject } from 'rxjs';
import type { ClientMessageInterface } from '@loopstack/contracts/types';

interface SseConnection {
  id: string;
  workerId: string;
  userId: string;
  subject: Subject<ClientMessageInterface>;
}

let connectionIdCounter = 0;

@Injectable()
export class SseEventService {
  private readonly logger = new Logger(SseEventService.name);
  private connections: Map<string, SseConnection[]> = new Map();

  private getConnectionKey(workerId: string, userId: string): string {
    return `worker:${workerId}-user:${userId}`;
  }

  registerConnection(workerId: string, userId: string): Subject<ClientMessageInterface> {
    const key = this.getConnectionKey(workerId, userId);
    const subject = new Subject<ClientMessageInterface>();
    const id = String(++connectionIdCounter);

    this.logger.debug(`Registering SSE connection ${id} for user ${userId} on worker ${workerId}`);

    if (!this.connections.has(key)) {
      this.connections.set(key, []);
    }

    this.connections.get(key)!.push({ id, workerId, userId, subject });

    // Attach the connection id so the controller can pass it back on unregister
    (subject as Subject<ClientMessageInterface> & { __sseConnectionId: string }).__sseConnectionId = id;

    return subject;
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
      // Backwards compat: remove the last connection if no id provided
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

  private sendToConnection(workerId: string, userId: string, message: ClientMessageInterface): void {
    const key = this.getConnectionKey(workerId, userId);
    const connections = this.connections.get(key);

    if (connections && connections.length > 0) {
      for (const connection of connections) {
        try {
          connection.subject.next(message);
        } catch (error) {
          this.logger.error(
            `Error sending message to connection ${connection.id} for user ${userId} on worker ${workerId}:`,
            error,
          );
        }
      }
    } else {
      this.logger.debug(`No active SSE connection found for user ${userId} on worker ${workerId}`);
    }
  }

  @OnEvent('client.message')
  handleClientMessage(payload: ClientMessageInterface): void {
    if (payload.userId && payload.workerId) {
      this.sendToConnection(payload.workerId, payload.userId, payload);
    } else {
      this.logger.warn(`Client message missing userId or workerId:`, payload);
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
}
