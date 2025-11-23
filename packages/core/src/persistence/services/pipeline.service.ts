import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
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
    userId: string,
    relations: string[] = ['workspace', 'namespaces'],
  ) {

    const where: FindOptionsWhere<PipelineEntity> = {
      id,
      createdBy: userId,
    }

    return this.entityRepository.findOne({
      where,
      relations,
    });
  }

  async createPipeline(
    data: Partial<PipelineEntity>,
    workspace: WorkspaceEntity,
    user: string,
  ) {
    const lastRunNumber = await this.getMaxRun(user, workspace.id);

    const pipeline = this.entityRepository.create({
      ...data,
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

  async getMaxRun(userId: string, workspaceId: string): Promise<number> {
    const query = this.entityRepository
      .createQueryBuilder('pipeline')
      .select('MAX(pipeline.run)', 'maxRun')
      .where('pipeline.workspaceId = :workspaceId', { workspaceId });

    if (userId) {
      query.andWhere('pipeline.createdBy = :userId', { userId });
    }

    const result = await query.getRawOne();
    return result?.maxRun ? Number(result.maxRun) : 0;
  }
}
