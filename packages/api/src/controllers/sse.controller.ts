import { Controller, Get, MessageEvent, Query, Req, Sse, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { Observable, concat, from, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { CurrentUser, CurrentUserInterface, RoleName, Roles } from '@loopstack/common';
import { SseEventService, SseStreamEvent } from '../services/sse-event.service.js';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/sse')
export class SseController {
  constructor(private readonly sseEventService: SseEventService) {}

  @Sse('stream')
  stream(
    @CurrentUser() user: CurrentUserInterface,
    @Req() request: Request,
    @Query('workflowId') workflowId?: string,
    @Query('lastEventId') lastEventIdQuery?: string,
  ): Observable<MessageEvent> {
    const headerValue = request.headers['last-event-id'];
    const lastEventId = (Array.isArray(headerValue) ? headerValue[0] : headerValue) ?? lastEventIdQuery;

    const subscription = this.sseEventService.registerConnection(user.workerId, user.userId, {
      lastEventId,
      workflowId,
    });

    request.on('close', () => {
      this.sseEventService.unregisterConnection(user.workerId, user.userId, subscription.connectionId);
    });

    // Replay is a synchronous snapshot, so live events emitted afterwards
    // cannot interleave ahead of it.
    const events$ = concat(from(subscription.replay), subscription.subject).pipe(
      map((event) => this.toMessageEvent(event)),
    );

    // Named `ping` events are invisible to `EventSource.onmessage` consumers.
    // They carry the connection's current cursor as id — Nest would otherwise
    // auto-assign its own frame counter and corrupt the client's resume cursor.
    const heartbeat$ = interval(this.sseEventService.heartbeatIntervalMs).pipe(
      map((): MessageEvent => ({ type: 'ping', id: subscription.cursor(), data: 'ping' })),
    );

    return merge(events$, heartbeat$);
  }

  private toMessageEvent(event: SseStreamEvent): MessageEvent {
    return { id: event.id, data: event.message };
  }

  @Get('health')
  @Roles(RoleName.ADMIN)
  health(): {
    active_connections: number;
    connections: string[];
    buffered_keys: number;
    buffered_events: number;
  } {
    const bufferStats = this.sseEventService.getBufferStats();
    return {
      active_connections: this.sseEventService.getConnectionCount(),
      connections: this.sseEventService.getActiveConnections(),
      buffered_keys: bufferStats.bufferedKeys,
      buffered_events: bufferStats.bufferedEvents,
    };
  }
}
