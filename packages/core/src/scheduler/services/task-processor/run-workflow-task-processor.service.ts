import { Inject, Injectable, Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { WORKFLOW_ORCHESTRATOR, type WorkflowOrchestrator } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { RunWorkflowTask } from '@loopstack/contracts/types';
import { WorkflowService, WorkspaceService } from '../../../persistence/index.js';
import { RootProcessorService } from '../../../workflow-processor/services/root-processor.service.js';
import { WorkflowMemoryMonitorService } from '../../../workflow-processor/services/workflow-memory-monitor.service.js';
import { WorkflowRegistryService } from '../../../workflow-processor/services/workflow-registry.service.js';

/** Enough registered names to recognize whose deployment this is, without filling the log. */
const MAX_LISTED_WORKFLOWS = 10;

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

      if (!this.workflowRegistryService.hasName(workflow.workflowName)) {
        throw new UnrecoverableError(this.foreignWorkflowMessage(workflow.workflowName));
      }

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

      if (!this.workflowRegistryService.hasName(task.workflowName)) {
        throw new UnrecoverableError(this.foreignWorkflowMessage(task.workflowName));
      }
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

  /**
   * A job for a workflow this deployment does not have can only come from another one: workers
   * consume any job on `task-queue`, so two deployments on the same Redis database form a single
   * worker pool over a single queue, and the run is left for a process that cannot resolve it.
   * Naming the cause here is the only place a reader will see it — the job is already consumed, so
   * the other deployment's run is lost either way.
   */
  private foreignWorkflowMessage(workflowName: string): string {
    const names = this.workflowRegistryService.names();
    const listed = names.slice(0, MAX_LISTED_WORKFLOWS).join(', ');
    const rest = names.length - MAX_LISTED_WORKFLOWS;
    const registered = names.length
      ? `Registered here: ${listed}${rest > 0 ? ` and ${rest} more` : ''}.`
      : 'No workflows are registered here.';

    return (
      `Workflow "${workflowName}" is not registered in this deployment, so this job belongs to another one. ` +
      'Two Loopstack deployments are sharing this Redis database and its "task-queue". Give each one its own ' +
      'database (REDIS_DB, or `redis.db` in LoopstackModule.forRoot) or its own Redis. ' +
      registered
    );
  }

  private isTerminal(status: WorkflowState): boolean {
    return status === WorkflowState.Completed || status === WorkflowState.Failed || status === WorkflowState.Canceled;
  }
}
