import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DocumentRepository, FrameworkContext, WorkflowOrchestrator } from '../interfaces';
import { DOCUMENT_REPOSITORY, FRAMEWORK_CONTEXT, TEMPLATE_RENDERER, WORKFLOW_ORCHESTRATOR } from '../tokens';
import { TemplateRenderFn } from './workflow-templates';

export interface RunOptions {
  alias?: string;
  callback?: { transition: string; metadata?: Record<string, unknown> };
  /** @internal — set automatically by `run()`. The resolved workflow instance. */
  _workflowInstance?: object;
}

export interface QueueResult {
  workflowId: string;
}

/** Base Zod schema for sub-workflow callback payloads. Extend with `.extend({ data: ... })` to type the result. */
export const CallbackSchema = z.object({
  workflowId: z.string(),
  status: z.string(),
  data: z.unknown(),
});

/**
 * Abstract base class for workflows in the TypeScript-first workflow model.
 *
 * Framework services are available on `this`:
 * - `this.repository` — document repository for creating/querying documents
 * - `this.ctx` — execution context (context, runtime, args, parent)
 * - `this.orchestrator` — workflow orchestrator for queuing sub-workflows
 *
 * Sub-workflows are launched via `this.subWorkflow.run(args, options)`.
 * Transition methods receive typed data as their first argument:
 * - `@Initial` methods receive the validated workflow args (TArgs)
 * - `@Transition({ wait: true })` methods receive the callback payload
 * - Auto `@Transition` methods receive no argument
 */
@Injectable()
export abstract class BaseWorkflow<TArgs = Record<string, unknown>> {
  /** Framework-provided document repository for creating/querying documents */
  @Inject(DOCUMENT_REPOSITORY) readonly repository!: DocumentRepository;

  /** Execution context — wired by the framework at runtime */
  @Inject(FRAMEWORK_CONTEXT) readonly ctx!: FrameworkContext;

  /** Workflow orchestrator — wired by the framework at runtime */
  @Inject(WORKFLOW_ORCHESTRATOR) readonly orchestrator!: WorkflowOrchestrator;

  /** Renders a Handlebars template file. Usage: `this.render(__dirname + '/templates/foo.md', { key: 'value' })` */
  @Inject(TEMPLATE_RENDERER) readonly render!: TemplateRenderFn;

  /** Launches this workflow as a sub-workflow via the orchestrator. */
  run(args: TArgs, options?: RunOptions): Promise<QueueResult> {
    return this.orchestrator.queue(args as Record<string, unknown>, {
      ...options,
      _workflowInstance: this,
    });
  }
}
