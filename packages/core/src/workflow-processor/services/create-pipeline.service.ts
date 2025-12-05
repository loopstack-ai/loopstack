import { Injectable } from '@nestjs/common';
import { PipelineEntity, WorkspaceEntity } from '@loopstack/common';
import { FindOptionsWhere } from 'typeorm';
import { BlockRegistryService } from './block-registry.service';
import { PipelineService, WorkspaceService } from '../../persistence';

@Injectable()
export class CreatePipelineService {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly pipelineService: PipelineService,
    private readonly blockRegistryService: BlockRegistryService,
  ) {}

  private validateArguments(data: Partial<PipelineEntity>) {
    if (!data.blockName) {
      throw new Error(`blockName is required to create a pipeline.`);
    }

    const blockRegistryItem = this.blockRegistryService.getBlock(
      data.blockName,
    );
    if (!blockRegistryItem) {
      throw new Error(`Config for block ${data.blockName} not found.`);
    }

    if (data.args && Object.keys(data.args).length !== 0) {
      const schema = blockRegistryItem.metadata.properties;
      data.args = schema?.parse(data.args);
    }

    return data;
  }

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

    const validData = this.validateArguments(data);
    return this.pipelineService.createPipeline(validData, workspace, user);
  }
}
