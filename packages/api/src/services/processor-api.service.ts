import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectEntity } from '@loopstack/core';
import { IsNull, Repository } from 'typeorm';
import { ProcessorService } from '@loopstack/core';
import { WorkspaceEntity } from '@loopstack/core';
import { TransitionPayloadInterface } from '@loopstack/shared';

@Injectable()
export class ProcessorApiService {
  constructor(
    @InjectRepository(ProjectEntity)
    private projectRepository: Repository<ProjectEntity>,
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
    private processorService: ProcessorService,
  ) {}

  async processProject(
    projectId: string,
    user: string | null,
    payload: { transition?: TransitionPayloadInterface },
    options?: {
      force?: boolean;
    },
  ): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        createdBy: user === null ? IsNull() : user,
      },
      relations: ['workspace', 'namespaces'],
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found.`);
    }

    if (project.workspace.isLocked && !options?.force) {
      throw new ConflictException(
        `Project with id ${projectId} is locked by another process. User force = true to override.`,
      );
    }

    project.workspace.isLocked = true;
    await this.workspaceRepository.save(project.workspace);

    const context = await this.processorService.process(
      {
        projectName: project.name,
      },
      {
        ...payload,
        userId: user,
        projectId: project.id,
        model: project.name,
        workspaceId: project.workspaceId,
        projectNamespaceIds: project.namespaceIds,
        namespaceIds: [],
      },
    );

    project.workspace.isLocked = false;
    await this.workspaceRepository.save(project.workspace);

    return context;
  }
}
