import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PipelineEntity } from '@loopstack/shared';

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

  getRepository() {
    return this.entityRepository;
  }
}
