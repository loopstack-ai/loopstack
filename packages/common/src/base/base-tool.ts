import { Inject, Injectable } from '@nestjs/common';
import { DocumentRepository, FrameworkContext, ToolCallOptions, ToolResult } from '../interfaces';
import { DOCUMENT_REPOSITORY, FRAMEWORK_CONTEXT, TEMPLATE_RENDERER } from '../tokens';
import { TemplateRenderFn } from './workflow-templates';

/**
 * Abstract base class for tools in the TypeScript-first workflow model.
 *
 * Tool authors extend this class and implement `call(args, options?)`:
 *
 * ```ts
 * const Schema = z.object({ a: z.number(), b: z.number() }).strict();
 * type Args = z.infer<typeof Schema>;
 *
 * @Tool({ schema: Schema })
 * class MathSumTool extends BaseTool {
 *   async call(args: Args): Promise<ToolResult<number>> {
 *     return { data: args.a + args.b };
 *   }
 * }
 * ```
 *
 * For async tools that launch sub-workflows, return `pending` in the result
 * and override `complete()` to post-process the sub-workflow result:
 *
 * ```ts
 * class MyAsyncTool extends BaseTool {
 *   @InjectWorkflow() private myWorkflow: MyWorkflow;
 *
 *   async call(args: Args, options?: ToolCallOptions) {
 *     const result = await this.myWorkflow.run(args, { callback: options?.callback });
 *     return { data: { workflowId: result.workflowId }, pending: { workflowId: result.workflowId } };
 *   }
 *
 *   async complete(result: Record<string, unknown>) {
 *     return { data: result.result };
 *   }
 * }
 * ```
 *
 * Framework services are available on `this`:
 * - `this.repository` — document repository for creating/querying documents
 * - `this.ctx` — execution context (context, runtime, args, parent)
 * - `this.render` — Handlebars template renderer
 */
@Injectable()
export abstract class BaseTool {
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
   * @param options — Framework-provided options (e.g. callback for async tool delegation)
   */
  abstract call(args: object, options?: ToolCallOptions): Promise<ToolResult>;

  /**
   * Called when an async sub-workflow completes and the callback fires.
   * Override to post-process the result (e.g. update link documents, transform data).
   * The default implementation passes through the sub-workflow result.
   */
  complete(result: Record<string, unknown>): Promise<ToolResult> {
    return Promise.resolve({ data: (result as { data?: unknown }).data ?? result });
  }
}
