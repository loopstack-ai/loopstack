import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ProjectEntity } from '../entities';

export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private projectRepository: Repository<ProjectEntity>,
  ) {}

  getProject(
    id: string,
    userId: string | null,
    relations: string[] = ['workspace', 'namespaces'],
  ) {
    return this.projectRepository.findOne({
      where: {
        id,
        createdBy: null === userId ? IsNull() : userId,
      },
      relations,
    });
  }
}
