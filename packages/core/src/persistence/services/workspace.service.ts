import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { WorkspaceEntity } from '@loopstack/common';
import { Logger } from '@nestjs/common';

export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  async getWorkspace(
    where: FindOptionsWhere<WorkspaceEntity>,
    user: string,
  ): Promise<WorkspaceEntity | null> {
    return this.workspaceRepository.findOne({
      where: {
        ...where,
        createdBy: user,
      },
    });
  }

  async create(data: Partial<WorkspaceEntity>, user: string) {
    const workspace = this.workspaceRepository.create({
      ...data,
      createdBy: user,
    });
    return await this.workspaceRepository.save(workspace);
  }
}
