import { Inject, Injectable } from '@nestjs/common';
import { DocumentRepository, FrameworkContext, WorkflowOrchestrator } from '../interfaces';
import { DOCUMENT_REPOSITORY, FRAMEWORK_CONTEXT, WORKFLOW_ORCHESTRATOR } from '../tokens';

export interface RunOptions {
  blockName: string;
  callback?: { transition: string };
}

export interface QueueResult {
  workflowId: string;
  correlationId: string;
  eventName: string;
}

/**
 * Abstract base class for workflows in the TypeScript-first workflow model.
 *
 * Framework services are available on `this`:
 * - `this.repository` — document repository for creating/querying documents
 * - `this.ctx` — execution context (context, runtime, args, parent)
 * - `this.orchestrator` — workflow orchestrator for queuing sub-workflows
 *
 * Sub-workflows are launched via `this.subWorkflow.run(args, options)`.
 * Use the generic type parameter to define typed args for the workflow:
 *
 * ```ts
 * export class MyWorkflow extends BaseWorkflow<{ name: string }> {
 *   // run() is inherited with typed args
 * }
 * ```
 */
@Injectable()
export abstract class BaseWorkflow<TArgs = Record<string, unknown>> {
  /** Framework-provided document repository for creating/querying documents */
  @Inject(DOCUMENT_REPOSITORY) readonly repository!: DocumentRepository;

  /** Execution context — wired by the framework at runtime */
  @Inject(FRAMEWORK_CONTEXT) readonly ctx!: FrameworkContext;

  /** Workflow orchestrator — wired by the framework at runtime */
  @Inject(WORKFLOW_ORCHESTRATOR) readonly orchestrator!: WorkflowOrchestrator;

  /** Launches this workflow as a sub-workflow via the orchestrator. */
  run(args: TArgs, options?: RunOptions): Promise<QueueResult> {
    return this.orchestrator.queue(args as Record<string, unknown>, options);
  }
}
