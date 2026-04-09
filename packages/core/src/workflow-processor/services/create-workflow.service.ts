import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { WorkflowEntity, WorkflowInterface, WorkspaceEntity, getBlockArgsSchema } from '@loopstack/common';
import { WorkflowService, WorkspaceService } from '../../persistence';
import { BlockDiscoveryService } from './block-discovery.service';

@Injectable()
export class CreateWorkflowService {
  private readonly logger = new Logger(CreateWorkflowService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly workflowService: WorkflowService,
    private readonly blockDiscoveryService: BlockDiscoveryService,
  ) {}

  private validateWorkflowArgs(workflow: WorkflowInterface, data: Partial<WorkflowEntity>): Partial<WorkflowEntity> {
    if (data.args && Object.keys(data.args as Record<string, unknown>).length !== 0) {
      const schema = getBlockArgsSchema(workflow);
      data.args = schema?.parse(data.args);
    }
    return data;
  }

  async create(
    workspaceWhere: FindOptionsWhere<WorkspaceEntity>,
    data: Partial<WorkflowEntity>,
    user: string,
    parentWorkflowId?: string,
    workflowInstance?: WorkflowInterface,
  ): Promise<WorkflowEntity> {
    if (!data.alias) {
      throw new Error('alias is required to create a workflow.');
    }

    const workspace = await this.workspaceService.getWorkspace(workspaceWhere, user);
    if (!workspace) {
      throw new Error('Workspace not found.');
    }

    const workspaceInstance = this.blockDiscoveryService.getWorkspace(workspace.className!);
    if (!workspaceInstance) {
      throw new BadRequestException(`Config for workspace with name ${workspace.className!} not found.`);
    }

    let parentWorkflow: WorkflowEntity | null = null;
    if (parentWorkflowId) {
      parentWorkflow = await this.workflowService.getWorkflow(parentWorkflowId, user, []);
    }

    // Sub-workflows pass the instance directly via BaseWorkflow.run().
    // Root workflows (from UI) are resolved by alias from the workspace.
    const workflow =
      workflowInstance ?? this.blockDiscoveryService.getWorkflowByName(data.alias);
    if (!workflow) {
      throw new Error(
        `Workflow ${data.alias} not found. Ensure it is registered as a provider in the module.`,
      );
    }

    const validData = this.validateWorkflowArgs(workflow, data);
    validData.className = workflow.constructor.name;
    return this.workflowService.createRootWorkflow(validData, workspace, user, parentWorkflow);
  }
}
