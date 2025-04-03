import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {ProjectProcessorService} from "@loopstack/core/dist/processor/services/project-processor.service";
import { RunProjectPayloadDto } from '../dtos/run-project-payload.dto';
import { ProjectEntity, WorkspaceEntity } from '@loopstack/core';

@Injectable()
export class ProcessorApiService {
  constructor(
    @InjectRepository(ProjectEntity)
    private projectRepository: Repository<ProjectEntity>,
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
    private processorService: ProjectProcessorService,
  ) {}

  async processProject(
    projectId: string,
    user: string | null,
    payload: RunProjectPayloadDto,
    options?: {
      force?: boolean;
    },
  ): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        createdBy: user === null ? IsNull() : user,
      },
      relations: ['workspace'],
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

    const context = await this.processorService.processProject(
      {
        userId: user,
        projectId: project.id,
        transition: payload.transition
      },
    );

    project.workspace.isLocked = false;
    await this.workspaceRepository.save(project.workspace);

    return context;
  }
}
