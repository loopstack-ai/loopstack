import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ClientMessage } from '@loopstack/contracts/events';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent('client.message')
  handle(payload: ClientMessage): void {
    const workflowId = 'workflowId' in payload ? payload.workflowId : undefined;
    this.auditLog.record({
      type: payload.type,
      workflowId,
      userId: payload.userId,
    });
    this.logger.log(`${payload.type} (workflow ${workflowId ?? '-'})`);
  }
}
