import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RunPipelinePayloadDto } from '../dtos/run-pipeline-payload.dto';
import {
  PipelineEntity,
  PipelineState,
  WorkspaceEntity,
} from '@loopstack/shared';
import { RootProcessorService } from '@loopstack/core/dist/modules/workflow-processor/services/root-processor.service';

@Injectable()
export class ProcessorApiService {
  constructor(
    @InjectRepository(PipelineEntity)
    private pipelineEntityRepository: Repository<PipelineEntity>,
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
    private rootProcessorService: RootProcessorService,
  ) {}

  async processPipeline(
    pipelineId: string,
    user: string | null,
    payload: RunPipelinePayloadDto,
    options?: {
      force?: boolean;
    },
  ): Promise<any> {
    const pipeline = await this.pipelineEntityRepository.findOne({
      where: {
        id: pipelineId,
        createdBy: user === null ? IsNull() : user,
      },
      relations: ['workspace'],
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with id ${pipelineId} not found.`);
    }

    if (pipeline.workspace.isLocked && !options?.force) {
      throw new ConflictException(
        `Pipeline with id ${pipelineId} is locked by another process. User force = true to override.`,
      );
    }

    pipeline.status = PipelineState.Running;
    await this.pipelineEntityRepository.save(pipeline);

    pipeline.workspace.isLocked = true;
    await this.workspaceRepository.save(pipeline.workspace);

    const finalContext = await this.rootProcessorService.processRootPipeline(
      pipeline,
      payload,
    );

    pipeline.status = finalContext.error
      ? PipelineState.Failed
      : finalContext.stop
        ? PipelineState.Paused
        : PipelineState.Completed;
    await this.pipelineEntityRepository.save(pipeline);

    pipeline.workspace.isLocked = false;
    await this.workspaceRepository.save(pipeline.workspace);

    return finalContext;
  }
}
