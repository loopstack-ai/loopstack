import { Injectable, Logger } from '@nestjs/common';
import {
  CreatePipelineService,
  RootProcessorService,
} from '../../../workflow-processor';
import {
  CreateRunPipelineTask,
  PipelineRootType, WorkspaceType,
} from '@loopstack/shared';
import { ConfigurationService } from '../../../configuration';
import { ConfigElementMetadata } from '@loopstack/shared/dist/schemas/config-element.schema';

@Injectable()
export class CreateRunPipelineTaskProcessorService {
  private readonly logger = new Logger(CreateRunPipelineTaskProcessorService.name);

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly createPipelineService: CreatePipelineService,
    private readonly rootProcessorService: RootProcessorService,
  ) {}

  public async process(task: CreateRunPipelineTask, metadata?: ConfigElementMetadata) {
    const pipelineConfig =
      this.configurationService.resolveConfig<PipelineRootType>(
        'pipelines',
        task.payload.pipeline,
        metadata?.includes ?? [],
      );
    if (pipelineConfig?.config?.type !== 'root') {
      throw new Error(`Can't execute a non root pipeline`);
    }

    const workspaceConfig =
      this.configurationService.resolveConfig<WorkspaceType>(
        'workspaces',
        pipelineConfig.config.workspace,
        pipelineConfig.includes ?? [],
      );
    if (!workspaceConfig) {
      throw new Error(`Can't resolve workspace ${pipelineConfig.config.workspace}`);
    }

    //todo: user
    //  also workspace config should allow defining unique workspaces so schedules are not executed twice
    throw Error('Scheduler must inherit the user')
    // const latestRunNumber = await this.createPipelineService.getLatestRunNumber(
    //
    // )

    const pipeline = await this.createPipelineService.create(
      {
        configKey: workspaceConfig.key,
      },
      {
        configKey: pipelineConfig.key,
        title: `${task.title ?? task.name} (scheduled)`,
      },
      null, //todo: on behalf of user X
    );

    this.logger.debug(
      `Pipeline for schedule task created with id ${pipeline.id}`,
    );

    await this.rootProcessorService.runPipeline(
      pipeline,
      task.payload,
      task.variables
    );
  }
}
