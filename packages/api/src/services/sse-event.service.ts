import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ClientMessageInterface } from '@loopstack/contracts/types';
import { Subject } from 'rxjs';

interface SseConnection {
  workerId: string;
  userId: string;
  subject: Subject<ClientMessageInterface>;
}

@Injectable()
export class SseEventService {
  private readonly logger = new Logger(SseEventService.name);
  private connections: Map<string, SseConnection> = new Map();

  private getConnectionKey(workerId: string, userId: string): string {
    return `worker:${workerId}-user:${userId}`;
  }

  registerConnection(
    workerId: string,
    userId: string,
  ): Subject<ClientMessageInterface> {
    const key = this.getConnectionKey(workerId, userId);
    const subject = new Subject<ClientMessageInterface>();

    this.logger.debug(`Registering SSE connection for user ${userId} on worker ${workerId}`);

    this.connections.set(key, {
      workerId,
      userId,
      subject,
    });

    return subject;
  }

  unregisterConnection(workerId: string, userId: string): void {
    const key = this.getConnectionKey(workerId, userId);
    const connection = this.connections.get(key);

    this.logger.debug(`Unregistering SSE connection for user ${userId} on worker ${workerId}`);

    if (connection) {
      connection.subject.complete();
      this.connections.delete(key);
    }
  }

  private sendToConnection(
    workerId: string,
    userId: string,
    message: ClientMessageInterface,
  ): void {
    const key = this.getConnectionKey(workerId, userId);
    const connection = this.connections.get(key);

    this.logger.debug(`Sending message to user ${userId} on worker ${workerId}: ${JSON.stringify(message)}`);

    if (connection) {
      try {
        connection.subject.next(message);
      } catch (error) {
        this.logger.error(
          `Error sending message to user ${userId} on worker ${workerId}:`,
          error,
        );
      }
    } else {
      this.logger.debug(
        `No active SSE connection found for user ${userId} on worker ${workerId}`,
      );
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
    return this.connections.size;
  }

  getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }
}
