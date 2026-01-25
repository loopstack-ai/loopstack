import { Injectable } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { PipelineEntity, WorkspaceEntity } from '@loopstack/common';
import { PipelineService, WorkspaceService } from '../../persistence';
import { WorkspaceBase } from '../abstract';
import { BlockRegistryService } from './block-registry.service';

@Injectable()
export class CreatePipelineService {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly pipelineService: PipelineService,
    private readonly blockRegistryService: BlockRegistryService,
  ) {}

  private validateArguments(workspace: WorkspaceBase, data: Partial<PipelineEntity>) {
    if (!data.blockName) {
      throw new Error(`blockName is required to create a pipeline.`);
    }

    const workflow = workspace.getWorkflow(data.blockName);
    if (!workflow) {
      throw new Error(`Workflow ${data.blockName} not available in workspace ${workspace.name}.`);
    }

    if (data.args && Object.keys(data.args as Record<string, unknown>).length !== 0) {
      const schema = workflow.argsSchema;
      data.args = schema?.parse(data.args);
    }

    return data;
  }

  async create(
    workspaceWhere: FindOptionsWhere<WorkspaceEntity>,
    data: Partial<PipelineEntity>,
    user: string,
    parentPipelineId?: string,
  ): Promise<PipelineEntity> {
    const workspace = await this.workspaceService.getWorkspace(workspaceWhere, user);
    if (!workspace) {
      throw new Error(`Workspace not found.`);
    }

    const workspaceRegistry = this.blockRegistryService.getBlock(workspace.blockName);
    if (!workspaceRegistry) {
      throw new Error(`Config for block ${data.blockName} not found.`);
    }

    let parentPipeline: PipelineEntity | null = null;
    if (parentPipelineId) {
      parentPipeline = await this.pipelineService.getPipeline(parentPipelineId, user, []);
    }

    const validData = this.validateArguments(workspaceRegistry.provider.instance as WorkspaceBase, data);
    return this.pipelineService.createPipeline(validData, workspace, user, parentPipeline);
  }
}
