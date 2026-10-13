import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { WorkspaceEntity } from '@loopstack/common';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
    private readonly eventEmitter: EventEmitter2,
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

  /**
   * Hard-delete one of the user's workspaces, and say so.
   *
   * The delete takes the workspace's runs with it (they cascade), and the in-process `workspace.deleted`
   * event is how the host app releases what it held for the workspace — its disk state, its containers, its
   * claims. Emitted once, after the delete committed. Cascaded runs do **not** emit their own
   * `workflow.deleted`: a workspace-level listener is expected to reclaim everything the workspace owned.
   */
  async delete(id: string, user: string): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({ where: { id, createdBy: user } });
    if (!workspace) throw new NotFoundException(`Workspace with ID ${id} not found`);

    await this.workspaceRepository.delete({ id, createdBy: user });
    this.eventEmitter.emit('workspace.deleted', { id, appName: workspace.appName, user });
  }
}
