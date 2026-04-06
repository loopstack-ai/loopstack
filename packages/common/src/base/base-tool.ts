import { Inject, Injectable } from '@nestjs/common';
import { DocumentRepository, FrameworkContext, ToolResult } from '../interfaces';
import { DOCUMENT_REPOSITORY, FRAMEWORK_CONTEXT, TEMPLATE_RENDERER } from '../tokens';
import { TemplateRenderFn } from './workflow-templates';

/**
 * Abstract base class for tools in the TypeScript-first workflow model.
 *
 * Tool authors extend this class and implement `call(args)`:
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
 * Workflows invoke tools with the same method: `this.myTool.call(args)`.
 * The framework transparently wraps `call()` at runtime with validation,
 * interceptors, and context management — tool authors don't need to know.
 *
 * Framework services are available on `this`:
 * - `this.repository` — document repository for creating/querying documents
 * - `this.ctx` — execution context (context, runtime, args, parent)
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
   */
  abstract call(args: object): Promise<ToolResult>;
}
