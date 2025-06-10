import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PipelineProcessorService } from '@loopstack/core';
import { RunPipelinePayloadDto } from '../dtos/run-pipeline-payload.dto';
import { PipelineEntity, WorkspaceEntity } from '@loopstack/shared';

@Injectable()
export class ProcessorApiService {
  constructor(
    @InjectRepository(PipelineEntity)
    private pipelineEntityRepository: Repository<PipelineEntity>,
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
    private processorService: PipelineProcessorService,
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

    pipeline.workspace.isLocked = true;
    await this.workspaceRepository.save(pipeline.workspace);

    const context = await this.processorService.processPipeline(
      {
        userId: user,
        pipelineId: pipeline.id,
        transition: payload.transition
      },
    );

    pipeline.workspace.isLocked = false;
    await this.workspaceRepository.save(pipeline.workspace);

    return context;
  }
}
