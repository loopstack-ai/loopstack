import { Injectable, SetMetadata } from '@nestjs/common';
import { RunContext } from '../dtos';
import { ToolResult } from './handler.interface';

export interface ToolExecutionContext {
  tool: object;
  args: Record<string, unknown> | undefined;
  runContext: RunContext;
  /** Mutable metadata — interceptors can attach data here for downstream interceptors */
  metadata: Record<string, unknown>;
}

/**
 * Interceptor for tool execution.
 *
 * Uses a chain pattern (like NestJS interceptors): each interceptor calls `next()`
 * to pass control to the next interceptor, and eventually to the actual tool.
 *
 * Mark your class with `@UseToolInterceptor()` to register it automatically.
 * The framework discovers all interceptors at module init via NestJS DiscoveryService.
 *
 * ```ts
 * @UseToolInterceptor()
 * class QuotaInterceptor implements ToolInterceptor {
 *   async intercept(context: ToolExecutionContext, next: () => Promise<ToolResult>): Promise<ToolResult> {
 *     await this.checkQuota(context);
 *     const result = await next();
 *     await this.reportUsage(context, result);
 *     return result;
 *   }
 * }
 * ```
 *
 * Interceptors can:
 * - Run logic before and after the tool call
 * - Transform the result
 * - Short-circuit by not calling `next()` (e.g. caching)
 * - Handle errors with try/catch around `next()`
 */
export interface ToolInterceptor {
  intercept(context: ToolExecutionContext, next: () => Promise<ToolResult>): Promise<ToolResult>;
}

/** Metadata key used by DiscoveryService to find tool interceptors */
export const TOOL_INTERCEPTOR_METADATA_KEY = 'loopstack:tool-interceptor';

/**
 * Marks a class as a tool interceptor. The framework discovers it automatically
 * at module init — no manual registration needed.
 *
 * The class must implement `ToolInterceptor` and be an `@Injectable()` NestJS provider
 * registered in a module.
 *
 * ```ts
 * @UseToolInterceptor()
 * class MyInterceptor implements ToolInterceptor { ... }
 * ```
 */
export function UseToolInterceptor(options?: { priority?: number }): ClassDecorator {
  return (target) => {
    Injectable()(target);
    SetMetadata(TOOL_INTERCEPTOR_METADATA_KEY, { priority: options?.priority ?? 100 })(target);
  };
}

/**
 * @deprecated Use `ToolInterceptor` with `@UseToolInterceptor()` instead.
 */
export type ToolExecutionInterceptor = ToolInterceptor;

/**
 * @deprecated Use `@UseToolInterceptor()` decorator instead of manual token registration.
 */
export const TOOL_INTERCEPTORS = 'TOOL_INTERCEPTORS';

/**
 * @deprecated Use `@UseToolInterceptor()` decorator instead.
 */
export const TOOL_EXECUTION_INTERCEPTORS = TOOL_INTERCEPTORS;
