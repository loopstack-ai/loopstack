import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { WorkspaceEntity } from '@loopstack/shared';
import { Logger } from '@nestjs/common';

export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  async getWorkspace(
    where: FindOptionsWhere<WorkspaceEntity>,
    user: string | null = null,
  ): Promise<WorkspaceEntity | null> {
    return this.workspaceRepository.findOne({
      where: {
        ...where,
        createdBy: user === null ? IsNull() : user,
      },
    });
  }

  async lockWorkspace(workspace: WorkspaceEntity, lock: boolean) {
    workspace.isLocked = lock;
    await this.workspaceRepository.save(workspace);
  }

  async create(data: Partial<WorkspaceEntity>, user: string | null) {
    const workspace = this.workspaceRepository.create({
      ...data,
      createdBy: user,
    });
    return await this.workspaceRepository.save(workspace);
  }

  getRepository() {
    return this.workspaceRepository;
  }
}
