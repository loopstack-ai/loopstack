import { Injectable, Logger } from '@nestjs/common';
import { BaseWorkflow, LaunchWorkflowOptions, LaunchWorkflowResult } from '@loopstack/common';
import { ExecutionScope } from '../utils';

/**
 * Handles sub-workflow orchestration for the new TypeScript-first workflow model.
 *
 * Reads the parent workflow's ExecutionContextManager from ExecutionScope
 * to access the parent context for instance creation and callback registration.
 *
 * Note: The actual implementation of workflow launching will be completed
 * in Phase 2 when the processor is adapted. This service provides the
 * interface and wiring now.
 */
@Injectable()
export class WorkflowOrchestrationService {
  private readonly logger = new Logger(WorkflowOrchestrationService.name);

  constructor(private readonly executionScope: ExecutionScope) {}

  launch(_workflow: BaseWorkflow, _options: LaunchWorkflowOptions): Promise<LaunchWorkflowResult> {
    // Verify we have an active execution scope
    this.executionScope.get();

    // TODO: Phase 2 — implement actual sub-workflow launching
    // This will:
    // 1. Create a new workflow instance via CreateWorkflowService
    // 2. Register callback transition if options.callback is set
    // 3. Return the created workflow ID
    return Promise.reject(
      new Error('WorkflowOrchestrationService.launch() is not yet implemented. Coming in Phase 2.'),
    );
  }
}
