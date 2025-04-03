import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceEntity } from '@loopstack/shared';

export class WorkspaceService {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  getWorkspace(id: string, relations: string[] = []) {
    return this.workspaceRepository.findOne({
      where: { id },
      relations,
    });
  }
}
