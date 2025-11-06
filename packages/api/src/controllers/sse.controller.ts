import {
  Controller,
  Get,
  Sse,
  Logger,
  Req,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SseEventService } from '../services/sse-event.service';
import { CurrentUser, CurrentUserInterface } from '@loopstack/shared';
import { Request } from 'express';

@ApiTags('api/v1/sse')
@Controller('api/v1/sse')
export class SseController {
  private readonly logger = new Logger(SseController.name);

  constructor(private readonly sseEventService: SseEventService) {}

  @Sse('stream')
  @ApiOperation({
    summary: 'Server-Sent Events stream',
    description:
      'Establishes a Server-Sent Events connection to receive real-time updates',
  })
  @ApiOkResponse({
    description: 'SSE stream established successfully',
  })
  stream(
    @CurrentUser() user: CurrentUserInterface,
    @Req() request: Request,
  ): Observable<MessageEvent> {
    const workerId = user.workerId;
    const userId = user.userId;

    const messageSubject = this.sseEventService.registerConnection(
      workerId,
      userId,
    );

    request.on('close', () => {
      this.sseEventService.unregisterConnection(workerId, userId);
    });

    return messageSubject.pipe(
      map((message) => ({
        data: message,
        type: message.type,
      })),
    );
  }

  @Get('health')
  @ApiOperation({
    summary: 'SSE health check',
    description: 'Returns the number of active SSE connections',
  })
  @ApiOkResponse({
    description: 'Health check response',
  })
  health(): {
    active_connections: number;
    connections: string[];
  } {
    return {
      active_connections: this.sseEventService.getConnectionCount(),
      connections: this.sseEventService.getActiveConnections(),
    };
  }
}
