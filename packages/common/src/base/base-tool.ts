import { Inject, Injectable } from '@nestjs/common';
import { DocumentRepository, FrameworkContext, ToolCallOptions, ToolResult } from '../interfaces/index.js';
import { DOCUMENT_REPOSITORY, FRAMEWORK_CONTEXT, TEMPLATE_RENDERER } from '../tokens.js';
import { assertToolsAvailable } from '../utils/block-metadata.utils.js';
import { TemplateRenderFn } from './workflow-templates.js';

/**
 * Abstract base class for tools in the TypeScript-first workflow model.
 *
 * Tool authors extend this class and implement `call(args, options?)`:
 *
 * ```ts
 * const ArgsSchema = z.object({ prompt: z.string() }).strict();
 * const ConfigSchema = z.object({ model: z.string().default('claude-sonnet-4-6') });
 * type Args = z.infer<typeof ArgsSchema>;
 * type Config = z.infer<typeof ConfigSchema>;
 *
 * @Tool({ schema: ArgsSchema, configSchema: ConfigSchema })
 * class MyTool extends BaseTool<Args, Config> {
 *   async call(args: Args, options?: ToolCallOptions<Config>): Promise<ToolResult> {
 *     const model = options?.config?.model;
 *     return { data: `Using ${model} for: ${args.prompt}` };
 *   }
 * }
 * ```
 *
 * - `args` — LLM-provided input, validated against `schema`
 * - `options.config` — author-provided config from `@InjectTool(config)`, validated against `configSchema`
 * - `options.callback` — framework-provided callback for async tool delegation
 *
 * Framework services are available on `this`:
 * - `this.repository` — document repository for creating/querying documents
 * - `this.ctx` — execution context (workspace, workflow, runtime, args, parent)
 * - `this.render` — Handlebars template renderer
 */
@Injectable()
export abstract class BaseTool<TArgs extends object = object, TConfig extends object = object> {
  /** Framework-provided document repository for creating/querying documents */
  @Inject(DOCUMENT_REPOSITORY) readonly repository!: DocumentRepository;

  /** Execution context — wired by the framework at runtime */
  @Inject(FRAMEWORK_CONTEXT) readonly ctx!: FrameworkContext;

  /** Renders a Handlebars template file. Usage: `this.render(__dirname + '/templates/foo.md', { key: 'value' })` */
  @Inject(TEMPLATE_RENDERER) readonly render!: TemplateRenderFn;

  /**
   * Implement this method with your tool logic.
   * The framework wraps this method at runtime with validation and interceptors.
   *
   * @param args — Validated input (against the `@Tool({ schema })` Zod schema)
   * @param options — Framework-provided options (callback, config from `@InjectTool`)
   */
  abstract call(args?: TArgs, options?: ToolCallOptions<TConfig>): Promise<ToolResult>;

  /**
   * Called when an async sub-workflow completes and the callback fires.
   * Override to post-process the result (e.g. update link documents, transform data).
   * The default implementation passes through the sub-workflow result.
   */
  complete(result: Record<string, unknown>): Promise<ToolResult> {
    return Promise.resolve({ data: (result as { data?: unknown }).data ?? result });
  }

  /**
   * Validates that all required tools are available on the parent workflow or app.
   * Call this before launching a sub-agent to fail fast on misconfiguration.
   *
   * @param toolNames — Tool property names that must be injected via `@InjectTool()` on the app
   */
  protected assertToolsAvailable(toolNames: string[]): void {
    assertToolsAvailable(this.constructor.name, this.ctx.workflow, toolNames, this.ctx.app);
  }
}
