import { BadRequestException, Injectable } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import {
  PipelineEntity,
  WorkflowInterface,
  WorkspaceEntity,
  WorkspaceInterface,
  getBlockArgsSchema,
  getBlockWorkflow,
} from '@loopstack/common';
import { PipelineService, WorkspaceService } from '../../persistence';
import { BlockDiscoveryService } from './block-discovery.service';

@Injectable()
export class CreatePipelineService {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly pipelineService: PipelineService,
    private readonly blockDiscoveryService: BlockDiscoveryService,
  ) {}

  private validateArguments(workspace: WorkspaceInterface, data: Partial<PipelineEntity>) {
    if (!data.blockName) {
      throw new Error(`blockName is required to create a pipeline.`);
    }

    const workflow = getBlockWorkflow<WorkflowInterface>(workspace, data.blockName);
    if (!workflow) {
      throw new Error(`Workflow ${data.blockName} not available in workspace ${workspace.constructor.name}.`);
    }

    if (data.args && Object.keys(data.args as Record<string, unknown>).length !== 0) {
      const schema = getBlockArgsSchema(workflow);
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

    const workspaceInstance = this.blockDiscoveryService.getWorkspace(workspace.blockName);
    if (!workspaceInstance) {
      throw new BadRequestException(`Config for workspace with name ${workspace.blockName} not found.`);
    }

    let parentPipeline: PipelineEntity | null = null;
    if (parentPipelineId) {
      parentPipeline = await this.pipelineService.getPipeline(parentPipelineId, user, []);
    }

    const validData = this.validateArguments(workspaceInstance, data);
    return this.pipelineService.createPipeline(validData, workspace, user, parentPipeline);
  }
}
