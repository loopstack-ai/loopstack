import { BadRequestException, Injectable } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import {
  BlockInterface,
  PipelineEntity,
  WorkflowInterface,
  WorkspaceEntity,
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

  private validateWorkflowArgs(workflow: WorkflowInterface, data: Partial<PipelineEntity>): Partial<PipelineEntity> {
    if (data.args && Object.keys(data.args as Record<string, unknown>).length !== 0) {
      const schema = getBlockArgsSchema(workflow);
      data.args = schema?.parse(data.args);
    }
    return data;
  }

  private resolveWorkflow(
    blockName: string,
    workspaceInstance: BlockInterface,
    parentWorkflowInstance?: WorkflowInterface | BlockInterface,
  ): WorkflowInterface {
    // Try parent workflow first
    if (parentWorkflowInstance) {
      const workflow = getBlockWorkflow<WorkflowInterface>(parentWorkflowInstance, blockName);
      if (workflow) {
        return workflow;
      }
    }

    // Fallback: resolve from workspace
    const workflow = getBlockWorkflow<WorkflowInterface>(workspaceInstance, blockName);
    if (workflow) {
      return workflow;
    }

    const parentName = parentWorkflowInstance?.constructor.name;
    throw new Error(
      `Workflow ${blockName} not found` +
        (parentName ? ` on parent workflow ${parentName} or` : ' on') +
        ` workspace ${workspaceInstance.constructor.name}.`,
    );
  }

  async create(
    workspaceWhere: FindOptionsWhere<WorkspaceEntity>,
    data: Partial<PipelineEntity>,
    user: string,
    parentPipelineId?: string,
    parentWorkflowInstance?: WorkflowInterface | BlockInterface,
  ): Promise<PipelineEntity> {
    if (!data.blockName) {
      throw new Error('blockName is required to create a pipeline.');
    }

    const workspace = await this.workspaceService.getWorkspace(workspaceWhere, user);
    if (!workspace) {
      throw new Error('Workspace not found.');
    }

    const workspaceInstance = this.blockDiscoveryService.getWorkspace(workspace.blockName);
    if (!workspaceInstance) {
      throw new BadRequestException(`Config for workspace with name ${workspace.blockName} not found.`);
    }

    let parentPipeline: PipelineEntity | null = null;
    if (parentPipelineId) {
      parentPipeline = await this.pipelineService.getPipeline(parentPipelineId, user, []);
    }

    const workflow = this.resolveWorkflow(data.blockName, workspaceInstance, parentWorkflowInstance);
    const validData = this.validateWorkflowArgs(workflow, data);
    return this.pipelineService.createPipeline(validData, workspace, user, parentPipeline);
  }
}
