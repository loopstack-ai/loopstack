import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ToolEnvelope,
  ToolExecutionContext,
  ToolInterceptor,
  UseToolInterceptor,
  getBlockName,
} from '@loopstack/common';
import { ExecutionScope, ExecutionScopeData } from '../utils/index.js';
import { ToolCallAuditService } from './tool-call-audit.service.js';

/**
 * Debug-mode audit: persists every tool call's args and response envelope, keyed by run and
 * transition. Enabled via `recordToolCalls` (`LOOPSTACK_RECORD_TOOL_CALLS=true`); inactive
 * otherwise. Stateless runs are skipped — they have no persistence and use replay fixtures.
 */
@UseToolInterceptor({ priority: 5 })
export class ToolCallAuditInterceptor implements ToolInterceptor {
  private readonly logger = new Logger(ToolCallAuditInterceptor.name);
  /** Per-execution-scope, per-transition call counters for the seq column. */
  private readonly counters = new WeakMap<ExecutionScopeData, Map<string, number>>();

  constructor(
    private readonly configService: ConfigService,
    private readonly executionScope: ExecutionScope,
    private readonly auditService: ToolCallAuditService,
  ) {}

  async intercept(context: ToolExecutionContext, next: () => Promise<ToolEnvelope>): Promise<ToolEnvelope> {
    const enabled = this.configService.get<boolean>('app.recordToolCalls') === true;
    const scope = this.executionScope.getOptional();
    if (!enabled || !scope || scope.options?.stateless || !scope.workflowId) {
      return next();
    }

    const envelope = await next();

    const transitionId = scope.transition?.id ?? null;
    const scopeCounters = this.counters.get(scope) ?? new Map<string, number>();
    this.counters.set(scope, scopeCounters);
    const counterKey = transitionId ?? '';
    const seq = scopeCounters.get(counterKey) ?? 0;
    scopeCounters.set(counterKey, seq + 1);

    try {
      await this.auditService.save({
        workflowId: scope.workflowId,
        workspaceId: scope.workspaceId,
        transitionId,
        place: scope.transition?.from ?? null,
        seq,
        toolName: getBlockName(context.tool as never),
        args: (context.args as Record<string, unknown> | undefined) ?? null,
        envelope: envelope as Record<string, unknown>,
      });
    } catch (error) {
      // Auditing must never break the tool call itself.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to persist tool-call audit record: ${message}`);
    }

    return envelope;
  }
}
