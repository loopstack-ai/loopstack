import { Injectable, Logger } from '@nestjs/common';
import type { RunWorkflowTask } from '@loopstack/contracts/types';
import { WorkflowService, WorkspaceService } from '../../../persistence';
import { RootProcessorService, WorkflowMemoryMonitorService } from '../../../workflow-processor';

@Injectable()
export class RunWorkflowTaskProcessorService {
  private readonly logger = new Logger(RunWorkflowTaskProcessorService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly workflowService: WorkflowService,
    private readonly rootProcessorService: RootProcessorService,
    private readonly memoryMonitor: WorkflowMemoryMonitorService,
  ) {}

  public async process(task: RunWorkflowTask) {
    if (task.workflowId) {
      this.memoryMonitor.logHeap(`task:${task.type}:before-workflow-load`);

      const workflow = await this.workflowService.getWorkflow(task.workflowId, task.user, [
        'workspace',
        'workspace.environments',
        'parent',
        'parent.workspace',
        'documents',
      ]);

      if (!workflow) {
        throw new Error(`Workflow with id ${task.workflowId} not found.`);
      }

      this.memoryMonitor.logHeap(`task:${task.type}:after-workflow-load:${workflow.alias}`);
      this.logger.debug(`Workflow for schedule task created with id ${workflow.id}`);

      await this.rootProcessorService.runWorkflow(workflow, task.payload);
    } else {
      if (!task.alias || !task.workspaceId) {
        throw new Error('Stateless execution requires alias and workspaceId in payload.');
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

      this.logger.debug(`Running stateless workflow for block ${task.alias}`);

      await this.rootProcessorService.runStateless(
        {
          workspaceId: task.workspaceId,
          workspaceName: workspace.className!,
          correlationId: task.correlationId,
          alias: task.alias,
          userId: task.user,
          args: task.args,
        },
        task.payload,
      );
    }
  }
}
