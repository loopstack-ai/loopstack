import { Injectable, Logger } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { WorkflowEntity, WorkflowInterface, WorkspaceEntity, getBlockArgsSchema } from '@loopstack/common';
import { WorkflowService, WorkspaceService } from '../../persistence/index.js';

@Injectable()
export class CreateWorkflowService {
  private readonly logger = new Logger(CreateWorkflowService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly workflowService: WorkflowService,
  ) {}

  private validateWorkflowArgs(workflow: WorkflowInterface, data: Partial<WorkflowEntity>): Partial<WorkflowEntity> {
    if (data.args && Object.keys(data.args as Record<string, unknown>).length !== 0) {
      const schema = getBlockArgsSchema(workflow);
      data.args = schema?.parse(data.args);
    }
    return data;
  }

  /**
   * Create a workflow entity from an already-resolved workflow instance.
   * The caller is responsible for resolving the workflow from the registry.
   */
  async create(
    workflow: WorkflowInterface,
    workspaceWhere: FindOptionsWhere<WorkspaceEntity>,
    data: Partial<WorkflowEntity>,
    user: string,
    parentWorkflowId?: string,
  ): Promise<WorkflowEntity> {
    if (!data.workflowName) {
      throw new Error('workflowName is required to create a workflow.');
    }

    const workspace = await this.workspaceService.getWorkspace(workspaceWhere, user);
    if (!workspace) {
      throw new Error('Workspace not found.');
    }

    let parentWorkflow: WorkflowEntity | null = null;
    if (parentWorkflowId) {
      parentWorkflow = await this.workflowService.getWorkflow(parentWorkflowId, user, []);
    }

    const validData = this.validateWorkflowArgs(workflow, data);
    return this.workflowService.createRootWorkflow(validData, workspace, user, parentWorkflow);
  }
}
