import { Injectable, Logger } from '@nestjs/common';
import {
  CreatePipelineService,
  RootProcessorService,
} from '../../../workflow-processor';
import {
  PipelineRootType,
} from '@loopstack/shared';
import { RunPipelineTask } from '@loopstack/shared/dist/schemas/startup.schema';
import { ConfigurationService } from '../../../configuration';
import { ConfigElementMetadata } from '@loopstack/shared/dist/schemas/config-element.schema';

@Injectable()
export class RunPipelineTaskProcessorService {
  private readonly logger = new Logger(RunPipelineTaskProcessorService.name);

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly createPipelineService: CreatePipelineService,
    private readonly rootProcessorService: RootProcessorService,
  ) {}

  public async process(task: RunPipelineTask, metadata: ConfigElementMetadata) {
    const pipelineConfig =
      this.configurationService.resolveConfig<PipelineRootType>(
        'pipelines',
        task.payload.pipeline,
        metadata.includes,
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
      {},
      {
        force: true,
      },
    );
  }
}
