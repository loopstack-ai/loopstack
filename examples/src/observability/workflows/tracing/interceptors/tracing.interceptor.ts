import { Logger } from '@nestjs/common';
import { ToolEnvelope, ToolExecutionContext, ToolInterceptor, UseToolInterceptor } from '@loopstack/common';
import { ToolTraceService } from '../services/tool-trace.service';

@UseToolInterceptor({ priority: 10 })
export class TracingInterceptor implements ToolInterceptor {
  private readonly logger = new Logger(TracingInterceptor.name);

  constructor(private readonly traceStore: ToolTraceService) {}

  async intercept(context: ToolExecutionContext, next: () => Promise<ToolEnvelope>): Promise<ToolEnvelope> {
    const toolName = context.tool.constructor.name;
    const workflowId = context.runContext.workflowId;
    const startTime = performance.now();

    try {
      const result = await next();
      this.trace(toolName, workflowId, startTime, true);
      return result;
    } catch (error) {
      this.trace(toolName, workflowId, startTime, false);
      throw error;
    }
  }

  private trace(toolName: string, workflowId: string, startTime: number, success: boolean): void {
    const durationMs = Math.round(performance.now() - startTime);
    this.traceStore.record({ toolName, workflowId, durationMs, success });
    this.logger.log(`${toolName} — ${success ? 'ok' : 'failed'} in ${durationMs}ms (workflow ${workflowId})`);
  }
}
