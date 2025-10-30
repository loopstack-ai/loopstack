import { Injectable } from '@nestjs/common';
import { PipelineEntity, WorkspaceEntity } from '@loopstack/shared';
import { FindOptionsWhere } from 'typeorm';
import { PipelineService, WorkspaceService } from '../../persistence';

@Injectable()
export class CreatePipelineService {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly pipelineService: PipelineService,
  ) {}

  async create(
    workspaceWhere: FindOptionsWhere<WorkspaceEntity>,
    data: Partial<PipelineEntity>,
    user: string,
  ): Promise<PipelineEntity> {
    const workspace = await this.workspaceService.getWorkspace(
      workspaceWhere,
      user,
    );

    if (!workspace) {
      throw new Error(`Workspace not found.`);
    }
    return this.pipelineService.createPipeline(data, workspace, user);
  }
}
