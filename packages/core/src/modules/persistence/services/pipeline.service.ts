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
    user: string,
  ) {
    const lastRunNumber = await this.getMaxRun(user, workspace.id);

    const pipeline = this.entityRepository.create({
      ...options,
      run: lastRunNumber + 1,
      createdBy: user,
      workspace,
    });
    return await this.entityRepository.save(pipeline);
  }

  async setPipelineStatus(pipeline: PipelineEntity, status: PipelineState) {
    pipeline.status = status;
    await this.entityRepository.save(pipeline);
  }

  async getMaxRun(userId: string | null, workspaceId: string): Promise<number> {
    const query = this.entityRepository
      .createQueryBuilder('pipeline')
      .select('MAX(pipeline.run)', 'maxRun')
      .where('pipeline.workspaceId = :workspaceId', { workspaceId });

    if (userId) {
      query.andWhere('pipeline.createdBy = :userId', { userId })
    }

    const result = await query.getRawOne();
    return result?.maxRun ? Number(result.maxRun) : 0;
  }

  getRepository() {
    return this.entityRepository;
  }
}
