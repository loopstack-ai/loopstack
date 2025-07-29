import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  PipelineEntity,
  PipelineState,
  WorkspaceEntity,
} from '@loopstack/shared';

export class PipelineService {
  constructor(
    @InjectRepository(PipelineEntity)
    private entityRepository: Repository<PipelineEntity>,
  ) {}

  getPipeline(
    id: string,
    userId: string | null,
    relations: string[] = ['workspace', 'namespaces'],
  ) {
    return this.entityRepository.findOne({
      where: {
        id,
        createdBy: null === userId ? IsNull() : userId,
      },
      relations,
    });
  }

  async createPipeline(
    options: Partial<PipelineEntity>,
    workspace: WorkspaceEntity,
    user: string | null,
  ) {
    const pipeline = this.entityRepository.create({
      ...options,
      createdBy: user,
      workspace,
    });
    return await this.entityRepository.save(pipeline);
  }

  async setPipelineStatus(pipeline: PipelineEntity, status: PipelineState) {
    pipeline.status = status;
    await this.entityRepository.save(pipeline);
  }

  getRepository() {
    return this.entityRepository;
  }
}
