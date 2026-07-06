import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ClientMessageInterface } from '@loopstack/contracts/types';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent('client.message')
  handle(payload: ClientMessageInterface): void {
    this.auditLog.record({
      type: payload.type,
      workflowId: payload.workflowId,
      userId: payload.userId,
    });
    this.logger.log(`${payload.type} (workflow ${payload.workflowId ?? '-'})`);
  }
}
