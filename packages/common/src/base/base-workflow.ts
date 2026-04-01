import { Injectable } from '@nestjs/common';

export interface LaunchWorkflowOptions {
  args?: Record<string, unknown>;
  callback?: { transition: string };
}

export interface LaunchWorkflowResult {
  data: { workflowId: string };
}

/**
 * Abstract base class for sub-workflows in the new TypeScript-first workflow model.
 *
 * The workflow proxy intercepts `.run()` calls on injected sub-workflows and
 * redirects them to `_run()`, which delegates to WorkflowOrchestrationService.
 */
@Injectable()
export abstract class BaseWorkflow {
  /** Public API for workflow authors */
  run(options: LaunchWorkflowOptions): Promise<LaunchWorkflowResult> {
    return this._run(options);
  }

  /**
   * Internal entry point called by the workflow proxy redirect.
   * Delegates to WorkflowOrchestrationService.
   *
   * Wired at runtime by the framework.
   */
  _run(_options: LaunchWorkflowOptions): Promise<LaunchWorkflowResult> {
    return Promise.reject(
      new Error(
        'BaseWorkflow._run() was called but has not been wired. ' +
          'Ensure the sub-workflow is used within a workflow transition with an active ExecutionScope.',
      ),
    );
  }
}
