import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { WorkspaceEntity } from '@loopstack/common';

export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  async getWorkspace(where: FindOptionsWhere<WorkspaceEntity>, user: string): Promise<WorkspaceEntity | null> {
    return this.workspaceRepository.findOne({
      where: {
        ...where,
        createdBy: user,
      },
    });
  }

  /**
   * The user's oldest workspace of `appName` that carries every one of `labels`. Array containment is not
   * expressible as a `FindOptionsWhere`, hence a query of its own. Oldest first, so that if two were ever
   * created for the same labels the same one is found every time.
   */
  async findByLabels(appName: string, labels: string[], user: string): Promise<WorkspaceEntity | null> {
    return this.workspaceRepository
      .createQueryBuilder('workspace')
      .where('workspace.app_name = :appName', { appName })
      .andWhere('workspace.created_by = :user', { user })
      .andWhere('workspace.labels @> :labels', { labels })
      .orderBy('workspace.created_at', 'ASC')
      .getOne();
  }

  async create(data: Partial<WorkspaceEntity>, user: string) {
    const workspace = this.workspaceRepository.create({
      ...data,
      appName: data.appName,
      createdBy: user,
    });
    return await this.workspaceRepository.save(workspace);
  }
}
