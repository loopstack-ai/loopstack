import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import {
  BaseTool,
  TOOL_INTERCEPTOR_METADATA_KEY,
  ToolCallOptions,
  ToolExecutionContext,
  ToolInterceptor,
  ToolPipeline,
  ToolResult,
  getBlockArgsSchema,
  getBlockConfigSchema,
} from '@loopstack/common';
import { ExecutionScope } from '../utils/index.js';

/**
 * Internal pipeline service injected into BaseTool via property injection.
 *
 * When a consumer calls `tool.call(args, options)`, BaseTool delegates to
 * `ToolPipelineService.execute()` which handles:
 * 1. Args validation against the tool's Zod schema
 * 2. Config validation against the tool's Zod configSchema
 * 3. Interceptor chain execution
 * 4. Calling the developer's `handle()` implementation
 */
@Injectable()
export class ToolPipelineService implements ToolPipeline, OnModuleInit {
  private readonly logger = new Logger(ToolPipelineService.name);

  /** Discovered interceptors, sorted by priority (lowest first = outermost in chain) */
  private interceptors: ToolInterceptor[] = [];

  constructor(
    private readonly executionScope: ExecutionScope,
    private readonly discoveryService: DiscoveryService,
  ) {}

  onModuleInit(): void {
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
   * Execute a tool call through the validation + interceptor pipeline.
   *
   * Called by `BaseTool.call()` — not used directly by consumers.
   */
  async execute<TArgs extends object, TConfig extends object, TResult, TMeta = Record<string, unknown>>(
    tool: BaseTool<TArgs, TConfig, TResult, TMeta>,
    args: TArgs | undefined,
    options?: ToolCallOptions<TConfig>,
  ): Promise<ToolResult<TResult, TMeta>> {
    // 1. Validate args against the tool's Zod schema
    const argsSchema = getBlockArgsSchema(tool as object);
    const validArgs = argsSchema ? (argsSchema.parse(args ?? {}) as TArgs) : (args ?? ({} as TArgs));

    // 2. Validate config against the tool's Zod configSchema
    const configSchema = getBlockConfigSchema(tool as object);
    const validConfig =
      configSchema && options?.config ? (configSchema.parse(options.config) as TConfig) : options?.config;

    const validOptions: ToolCallOptions<TConfig> | undefined =
      validConfig !== options?.config ? { ...options, config: validConfig } : options;

    // 3. Build execution context for interceptors (from ExecutionScope)
    const scope = this.executionScope.getOptional();
    const loopstackContext = scope
      ? {
          userId: scope.userId,
          workspaceId: scope.workspaceId,
          workflowId: scope.workflowId,
          run: { args: scope.args, config: scope.config },
        }
      : { userId: '', workspaceId: '', workflowId: '', run: { args: undefined, config: undefined } };

    const execContext: ToolExecutionContext = {
      tool,
      args: validArgs as Record<string, unknown> | undefined,
      loopstackContext,
      metadata: {},
    };

    // 4. Build interceptor chain — each interceptor wraps the next, innermost is the tool call
    const toolCall = () =>
      (
        tool as unknown as { handle(a: TArgs, o?: ToolCallOptions<TConfig>): Promise<ToolResult<TResult, TMeta>> }
      ).handle(validArgs, validOptions);

    const chain = this.interceptors.reduceRight<() => Promise<ToolResult<TResult, TMeta>>>(
      (next, interceptor) => () =>
        interceptor.intercept(execContext, next as () => Promise<ToolResult>) as Promise<ToolResult<TResult, TMeta>>,
      toolCall,
    );

    return chain();
  }
}
