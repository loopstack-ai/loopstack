import { Injectable, Logger } from '@nestjs/common';
import type { RunWorkflowTask } from '@loopstack/contracts/types';
import { WorkflowService, WorkspaceService } from '../../../persistence/index.js';
import { RootProcessorService } from '../../../workflow-processor/services/root-processor.service.js';
import { WorkflowMemoryMonitorService } from '../../../workflow-processor/services/workflow-memory-monitor.service.js';

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
        'parent',
        'parent.workspace',
        'documents',
      ]);

      if (!workflow) {
        throw new Error(`Workflow with id ${task.workflowId} not found.`);
      }

      this.memoryMonitor.logHeap(`task:${task.type}:after-workflow-load:${workflow.workflowName}`);
      this.logger.debug(`Workflow for schedule task created with id ${workflow.id}`);

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

      await this.rootProcessorService.runStateless(
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
}
