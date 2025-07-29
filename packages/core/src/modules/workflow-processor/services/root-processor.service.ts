import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../../common';
import {
  ContextInterface,
  PipelineEntity,
  PipelineState,
} from '@loopstack/shared';
import {
  NamespacesService,
  PipelineService,
  WorkspaceService,
} from '../../persistence';
import { PipelineProcessorService } from './pipeline-processor.service';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private contextService: ContextService,
    private pipelineService: PipelineService,
    private workspaceService: WorkspaceService,
    private processorService: PipelineProcessorService,
    private namespacesService: NamespacesService,
  ) {}

  private async processRootPipeline(
    pipeline: PipelineEntity,
    payload: any,
  ): Promise<ContextInterface> {
    const namespace =
      await this.namespacesService.createRootNamespace(pipeline);

    const context = this.contextService.createRootContext(pipeline, {
      labels: [...pipeline.labels, namespace.name],
      namespace: namespace,
      transition: payload.transition,
      stop: false,
      error: false,
    });

    return this.processorService.processPipelineItem(
      {
        pipeline: pipeline.model,
      },
      context,
    );
  }

  async runPipeline(
    pipeline: PipelineEntity,
    payload: any,
    options?: {
      force?: boolean;
    },
  ): Promise<ContextInterface> {
    if (pipeline.workspace.isLocked && !options?.force) {
      throw new ConflictException(
        `Workspace with id ${pipeline.workspace.id} is locked by another process. User force = true to override.`,
      );
    }

    await this.pipelineService.setPipelineStatus(
      pipeline,
      PipelineState.Running,
    );
    await this.workspaceService.lockWorkspace(pipeline.workspace, true);

    const finalContext = await this.processRootPipeline(pipeline, payload);

    const status = finalContext.error
      ? PipelineState.Failed
      : finalContext.stop
        ? PipelineState.Paused
        : PipelineState.Completed;

    await this.pipelineService.setPipelineStatus(pipeline, status);
    await this.workspaceService.lockWorkspace(pipeline.workspace, false);

    return finalContext;
  }
}
