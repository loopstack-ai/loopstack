import { Injectable, Logger } from '@nestjs/common';
import type { RunPipelineTask } from '@loopstack/contracts/types';
import { PipelineService, WorkspaceService } from '../../../persistence';
import { RootProcessorService, WorkflowMemoryMonitorService } from '../../../workflow-processor';

@Injectable()
export class RunPipelineTaskProcessorService {
  private readonly logger = new Logger(RunPipelineTaskProcessorService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly pipelineService: PipelineService,
    private readonly rootProcessorService: RootProcessorService,
    private readonly memoryMonitor: WorkflowMemoryMonitorService,
  ) {}

  public async process(task: RunPipelineTask) {
    if (task.pipelineId) {
      this.memoryMonitor.logHeap(`task:${task.type}:before-pipeline-load`);

      const pipeline = await this.pipelineService.getPipeline(task.pipelineId, task.user, [
        'workspace',
        'workspace.environments',
        'parent',
        'parent.workspace',
      ]);

      if (!pipeline) {
        throw new Error(`Pipeline with id ${task.pipelineId} not found.`);
      }

      this.memoryMonitor.logHeap(`task:${task.type}:after-pipeline-load:${pipeline.blockName}`);
      this.logger.debug(`Pipeline for schedule task created with id ${pipeline.id}`);

      await this.rootProcessorService.runPipeline(pipeline, task.payload);
    } else {
      if (!task.blockName || !task.workspaceId) {
        throw new Error('Stateless execution requires blockName and workspaceId in payload.');
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

      this.logger.debug(`Running stateless pipeline for block ${task.blockName}`);

      await this.rootProcessorService.runStateless(
        {
          workspaceId: task.workspaceId,
          workspaceName: workspace.blockName,
          correlationId: task.correlationId,
          blockName: task.blockName,
          userId: task.user,
          args: task.args,
        },
        task.payload,
      );
    }
  }
}
