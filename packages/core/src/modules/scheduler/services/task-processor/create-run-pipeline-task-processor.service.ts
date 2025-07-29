import { Injectable, Logger } from '@nestjs/common';
import {
  CreatePipelineService,
  RootProcessorService,
} from '../../../workflow-processor';
import {
  CreateRunPipelineTask,
  PipelineRootType,
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

    const pipeline = await this.createPipelineService.create(
      {
        type: pipelineConfig.config.workspace,
      },
      {
        model: `${pipelineConfig.path}:${pipelineConfig.name}`,
        title: `Scheduled Task (${pipelineConfig.name})`,
      },
      null, //todo: on behalf of user X
    );

    this.logger.debug(
      `Pipeline for schedule task created with id ${pipeline.id}`,
    );

    await this.rootProcessorService.runPipeline(
      pipeline,
      task.payload,
    );
  }
}
