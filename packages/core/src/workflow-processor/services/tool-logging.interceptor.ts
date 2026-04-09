import { Logger } from '@nestjs/common';
import { ToolExecutionContext, ToolInterceptor, ToolResult, UseToolInterceptor } from '@loopstack/common';

/**
 * Built-in interceptor that logs tool execution with timing.
 * Priority 0 — runs first (outermost), so timing includes all other interceptors.
 */
@UseToolInterceptor({ priority: 0 })
export class ToolLoggingInterceptor implements ToolInterceptor {
  private readonly logger = new Logger('ToolExecution');

  async intercept(context: ToolExecutionContext, next: () => Promise<ToolResult>): Promise<ToolResult> {
    const toolName = context.tool.constructor.name;
    const startTime = performance.now();

    this.logger.debug(`${toolName} — executing`);

    try {
      const result = await next();
      const durationMs = Math.round(performance.now() - startTime);

      context.metadata.durationMs = durationMs;

      this.logger.debug(`${toolName} — completed in ${durationMs}ms`);

      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);

      context.metadata.durationMs = durationMs;

      this.logger.warn(
        `${toolName} — failed after ${durationMs}ms: ${error instanceof Error ? error.message : String(error)}`,
      );

      throw error;
    }
  }
}
