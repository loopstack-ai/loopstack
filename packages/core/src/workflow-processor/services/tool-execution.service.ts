import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import {
  BaseTool,
  TOOL_INTERCEPTOR_METADATA_KEY,
  ToolExecutionContext,
  ToolInterceptor,
  ToolResult,
  getBlockArgsSchema,
  getBlockTools,
} from '@loopstack/common';
import { ExecutionScope, wrapToolProxy } from '../utils';

/**
 * Executes tools by wrapping them in proxies that add framework logic.
 *
 * During wireAndProxyTool(), each tool is wrapped in a Proxy (via wrapToolProxy)
 * that intercepts call() and routes through executeCall(). This adds validation,
 * interceptor chain, and side-effect processing transparently.
 *
 * Interceptors are discovered automatically at module init — any @Injectable() class
 * marked with @UseToolInterceptor() is picked up via NestJS DiscoveryService.
 * Ordering is controlled by priority (lower = runs first / outermost).
 */
@Injectable()
export class ToolExecutionService implements OnModuleInit {
  private readonly logger = new Logger(ToolExecutionService.name);

  /** Tracks which tool instances have already been proxied (idempotent wiring) */
  private readonly proxiedTools = new WeakSet<object>();

  /** Discovered interceptors, sorted by priority (lowest first = outermost in chain) */
  private interceptors: ToolInterceptor[] = [];

  constructor(
    private readonly executionScope: ExecutionScope,
    private readonly discoveryService: DiscoveryService,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    const discovered: { instance: ToolInterceptor; priority: number }[] = [];

    for (const wrapper of providers) {
      if (!wrapper.metatype || !wrapper.instance) continue;
      const meta = Reflect.getMetadata(TOOL_INTERCEPTOR_METADATA_KEY, wrapper.metatype) as
        | { priority: number }
        | undefined;
      if (meta) {
        discovered.push({ instance: wrapper.instance as ToolInterceptor, priority: meta.priority });
      }
    }

    // Sort by priority: lower number = outermost (runs first)
    discovered.sort((a, b) => a.priority - b.priority);
    this.interceptors = discovered.map((d) => d.instance);

    this.logger.log(
      `Discovered ${this.interceptors.length} tool interceptor(s): ${this.interceptors.map((i) => i.constructor.name).join(', ')}`,
    );
  }

  /**
   * Framework wrapper around a tool's call(). Called by the tool proxy.
   *
   * Flow:
   * 1. Validate args (framework guarantee — always runs)
   * 2. Run interceptor chain (user-configurable)
   */
  async executeCall(
    rawTool: object,
    originalCallFn: (...callArgs: unknown[]) => unknown,
    args: Record<string, unknown>,
    proxy: object,
    options?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const baseTool = rawTool as BaseTool;
    const ctx = this.executionScope.get();

    // 1. Validate args (framework guarantee)
    const schema = getBlockArgsSchema(baseTool as object);
    const validArgs = schema ? (schema.parse(args) as Record<string, unknown>) : args;

    // 2. Build execution context
    const execContext: ToolExecutionContext = {
      tool: baseTool,
      args: validArgs,
      runContext: ctx.getContext(),
      metadata: {},
    };

    // 3. Build interceptor chain — each interceptor wraps the next, innermost is the tool call
    const toolCall = () => originalCallFn.call(proxy, validArgs, options) as Promise<ToolResult>;

    const chain = this.interceptors.reduceRight<() => Promise<ToolResult>>(
      (next, interceptor) => () => interceptor.intercept(execContext, next),
      toolCall,
    );

    const result = await chain();

    return result;
  }

  /**
   * Wraps a tool instance in a proxy. Returns the proxy.
   * Also recursively proxies nested @InjectTool() dependencies.
   */
  wireAndProxyTool(tool: object, toolName: string): object {
    // Already proxied (singleton reused across workflow runs) — return as-is
    if (this.proxiedTools.has(tool)) {
      return tool;
    }

    const proxy = wrapToolProxy(tool, toolName, this.executionScope, this.executeCall.bind(this));
    this.proxiedTools.add(proxy);

    // Recursively wire nested @InjectTool() dependencies
    const nestedToolNames = getBlockTools(tool);
    for (const nestedName of nestedToolNames) {
      const nestedTool = (tool as Record<string, unknown>)[nestedName] as object | undefined;
      if (nestedTool && !this.proxiedTools.has(nestedTool)) {
        const nestedProxy = this.wireAndProxyTool(nestedTool, nestedName);
        (tool as Record<string, unknown>)[nestedName] = nestedProxy;
      }
    }

    return proxy;
  }
}
