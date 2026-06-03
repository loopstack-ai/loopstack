import { Inject, Injectable } from '@nestjs/common';
import type { DocumentStore } from '../interfaces/document-store.interface.js';
import type { ToolCallOptions, ToolResult } from '../interfaces/handler.interface.js';
import type { LoopstackContext } from '../interfaces/loopstack-context.interface.js';
import type { ToolPipeline } from '../interfaces/tool-pipeline.interface.js';
import { DOCUMENT_STORE, TOOL_PIPELINE } from '../tokens.js';

/**
 * Abstract base class for tools.
 *
 * Tool authors extend this class and implement `handle(args, ctx, options?)`.
 * Consumers call `tool.call(args, options?)` — the base class routes through
 * `ToolPipelineService` which handles validation, config merging, and interceptors.
 *
 * ```ts
 * @Tool({ schema: ArgsSchema, configSchema: ConfigSchema })
 * class MyTool extends BaseTool<Args, Config, MyResult> {
 *   protected async handle(args: Args, ctx: LoopstackContext, options?: ToolCallOptions<Config>): Promise<ToolResult<MyResult>> {
 *     return { data: { value: args.prompt } };
 *   }
 * }
 * ```
 *
 * Generic parameters:
 * - `TArgs` — input args, validated against `@Tool({ schema })`
 * - `TConfig` — config, validated against `@Tool({ configSchema })`
 * - `TResult` — typed return data in `ToolResult<TResult>`
 * - `TMeta` — typed metadata in `ToolResult<TResult, TMeta>` (defaults to `Record<string, unknown>`)
 */
@Injectable()
export abstract class BaseTool<
  TArgs extends object = object,
  TConfig extends object = object,
  TResult = unknown,
  TMeta = Record<string, unknown>,
> {
  /** @internal — injected by the framework. Routes call() through validation + interceptors. */
  @Inject(TOOL_PIPELINE) private readonly __pipeline!: ToolPipeline;

  /** Document store for saving and retrieving documents. */
  @Inject(DOCUMENT_STORE) protected readonly documentStore!: DocumentStore;

  /**
   * Public entry point — what consumers call.
   * Routes through ToolPipelineService for validation, config merge, and interceptors.
   */
  async call(args?: TArgs, options?: ToolCallOptions<TConfig>): Promise<ToolResult<TResult, TMeta>> {
    return this.__pipeline.execute(this, args, options);
  }

  /**
   * Implement this method with your tool logic.
   * Called by the pipeline after validation and interceptors.
   *
   * @param args — Validated input (against the `@Tool({ schema })` Zod schema)
   * @param ctx — Read-only execution context: userId, workspaceId, workflowId, args
   * @param options — Options including validated config and optional tools/callback
   */
  protected abstract handle(
    args: TArgs,
    ctx: LoopstackContext,
    options?: ToolCallOptions<TConfig>,
  ): Promise<ToolResult<TResult, TMeta>>;

  /**
   * Called when an async sub-workflow completes and the callback fires.
   * Override to post-process the result (e.g. update link documents, transform data).
   * The default implementation passes through the sub-workflow result.
   */
  async complete(result: Record<string, unknown>): Promise<ToolResult> {
    return { data: (result as { data?: unknown }).data ?? result };
  }
}
