import { InjectRepository } from '@nestjs/typeorm';
import {IsNull, Repository} from 'typeorm';
import { ProjectEntity } from '../entities/project.entity';
import {WorkspaceService} from "./workspace.service";

export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private projectRepository: Repository<ProjectEntity>,
    private workspaceService: WorkspaceService,
  ) {}

  getProject(id: string, userId: string | null, relations: string[] = ['workspace']) {
    return this.projectRepository.findOne({
      where: {
        id,
        createdBy: null === userId ? IsNull() : userId,
      },
      relations,
    });
  }

  async createProject(workspaceId: string, config: { name: string; }): Promise<ProjectEntity> {

    const workspace = await this.workspaceService.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace with id ${workspaceId} not found.`)
    }

    const entity = this.projectRepository.create({
      name: config.name,
      workspace,
    });

    return this.projectRepository.save(entity);
  }
}
