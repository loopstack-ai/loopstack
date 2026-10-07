import { Inject, Injectable, Logger } from '@nestjs/common';
import { WORKFLOW_ORCHESTRATOR, type WorkflowOrchestrator } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { RunWorkflowTask } from '@loopstack/contracts/types';
import { WorkflowService, WorkspaceService } from '../../../persistence/index.js';
import { RootProcessorService } from '../../../workflow-processor/services/root-processor.service.js';
import { WorkflowMemoryMonitorService } from '../../../workflow-processor/services/workflow-memory-monitor.service.js';
import { WorkflowRegistryService } from '../../../workflow-processor/services/workflow-registry.service.js';

@Injectable()
export class RunWorkflowTaskProcessorService {
  private readonly logger = new Logger(RunWorkflowTaskProcessorService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly workflowService: WorkflowService,
    private readonly rootProcessorService: RootProcessorService,
    private readonly memoryMonitor: WorkflowMemoryMonitorService,
    private readonly workflowRegistryService: WorkflowRegistryService,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
  ) {}

  public async process(task: RunWorkflowTask) {
    if (task.workflowId) {
      this.memoryMonitor.logHeap(`task:${task.type}:before-workflow-load`);

      const workflow = await this.workflowService.getWorkflow(task.workflowId, task.user, [
        'workspace',
        'parent',
        'parent.workspace',
        'documents',
      ]);

      if (!workflow) {
        throw new Error(`Workflow with id ${task.workflowId} not found.`);
      }

      this.memoryMonitor.logHeap(`task:${task.type}:after-workflow-load:${workflow.workflowName}`);
      this.logger.debug(`Workflow for schedule task created with id ${workflow.id}`);

      // A job can sit in BullMQ's `active` set — picked up by the worker but blocked on the
      // workspace lock — while cancel() runs. cancel() only removes waiting/delayed/prioritized
      // jobs, so it cannot stop this one; it just flips the entity to a terminal state. Without
      // this guard the job would later acquire the lock, run the workflow to completion, and fire a
      // duplicate parent callback. Refuse to execute an already-terminal workflow. Legitimate
      // resumes/retries always transit through Pending/Waiting first, so they are unaffected.
      if (this.isTerminal(workflow.status)) {
        this.logger.warn(
          `Skipping execution of workflow ${workflow.id} — already in terminal state "${workflow.status}".`,
        );
        return;
      }

      await this.rootProcessorService.runWorkflow(workflow, task.payload);
    } else {
      if (!task.workflowName || !task.workspaceId) {
        throw new Error('Stateless execution requires workflowName and workspaceId in payload.');
      }

      const workspace = await this.workspaceService.getWorkspace(
        {
          id: task.workspaceId,
        },
        task.user,
      );

      if (!workspace) {
        throw new Error(`Workspace with id ${task.workspaceId} not found.`);
      }

      this.logger.debug(`Running stateless workflow: ${task.workflowName}`);
      const { instance } = this.workflowRegistryService.resolve(task.workflowName);

      await this.rootProcessorService.runStateless(
        instance,
        {
          workspaceId: task.workspaceId,
          correlationId: task.correlationId,
          workflowName: task.workflowName,
          userId: task.user,
          args: task.args,
        },
        task.payload,
      );
    }
  }

  /**
   * Fail the run of a task the queue has given up on — out of attempts, or interrupted more often than the
   * stall limit allows. Nothing else would ever settle it: the run keeps its place and gets an error, so a
   * manual retry re-enters it there, and its parent is called back as for any other failure.
   */
  public async abandon(task: RunWorkflowTask, reason: string) {
    if (!task.workflowId) return;

    const workflow = await this.workflowService.findById(task.workflowId);
    if (!workflow || this.isTerminal(workflow.status)) return;

    this.logger.warn(`Failing workflow ${workflow.id} at '${workflow.place}' — its task was abandoned: ${reason}`);
    workflow.hasError = true;
    workflow.errorMessage = reason;
    await this.workflowService.setWorkflowStatus(workflow, WorkflowState.Failed);
    await this.orchestrator.complete(workflow);
  }

  private isTerminal(status: WorkflowState): boolean {
    return status === WorkflowState.Completed || status === WorkflowState.Failed || status === WorkflowState.Canceled;
  }
}
