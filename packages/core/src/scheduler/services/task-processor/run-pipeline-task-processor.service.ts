import { Injectable, Logger } from '@nestjs/common';
import type { RunPipelineTask } from '@loopstack/contracts/types';
import { PipelineService, WorkspaceService } from '../../../persistence';
import { RootProcessorService } from '../../../workflow-processor';

@Injectable()
export class RunPipelineTaskProcessorService {
  private readonly logger = new Logger(RunPipelineTaskProcessorService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly pipelineService: PipelineService,
    private readonly rootProcessorService: RootProcessorService,
  ) {}

  public async process(task: RunPipelineTask) {
    if (task.pipelineId) {
      const pipeline = await this.pipelineService.getPipeline(
        task.pipelineId,
        task.user,
        ['workspace'], // todo: processing fails when loading namespaces relation. why?
      );

      if (!pipeline) {
        throw new Error(`Pipeline with id ${task.pipelineId} not found.`);
      }

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
