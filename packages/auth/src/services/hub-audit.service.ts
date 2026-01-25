import { Injectable, Logger } from '@nestjs/common';
import { RequestContext } from '../interfaces/hub-service.interfaces';

export interface HubAuditEvent {
  action: string;
  context: RequestContext;
  success: boolean;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class HubAuditService {
  private readonly logger = new Logger(HubAuditService.name);

  logCodeExchange(
    context: RequestContext,
    success: boolean,
    responseTime: number,
    error?: string,
    metadata?: Record<string, any>,
  ) {
    const event: HubAuditEvent = {
      action: 'HUB_CODE_EXCHANGE',
      context,
      success,
      responseTime,
      error,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    };

    if (success) {
      this.logger.log(`HUB_AUDIT: ${JSON.stringify(this.sanitizeEvent(event))}`);
    } else {
      this.logger.error(`HUB_AUDIT_FAILURE: ${JSON.stringify(this.sanitizeEvent(event))}`);
    }
  }

  private sanitizeEvent(event: HubAuditEvent): HubAuditEvent {
    return {
      ...event,
      context: {
        ...event.context,
        userId: event.context.userId ? `${event.context.userId.substring(0, 8)}...` : undefined,
      },
    };
  }
}
