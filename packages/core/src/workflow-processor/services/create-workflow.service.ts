import { Injectable, Logger } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { WorkflowEntity, WorkflowInterface, WorkspaceEntity, getBlockArgsSchema } from '@loopstack/common';
import { WorkflowService, WorkspaceService } from '../../persistence/index.js';
import { WorkflowRegistryService } from './workflow-registry.service.js';

@Injectable()
export class CreateWorkflowService {
  private readonly logger = new Logger(CreateWorkflowService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly workflowService: WorkflowService,
    private readonly workflowRegistryService: WorkflowRegistryService,
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
    if (!data.workflowName) {
      throw new Error('alias is required to create a workflow.');
    }

    const workspace = await this.workspaceService.getWorkspace(workspaceWhere, user);
    if (!workspace) {
      throw new Error('Workspace not found.');
    }

    let parentWorkflow: WorkflowEntity | null = null;
    if (parentWorkflowId) {
      parentWorkflow = await this.workflowService.getWorkflow(parentWorkflowId, user, []);
    }

    const workflow = workflowInstance ?? this.workflowRegistryService.getByName(data.workflowName);

    const validData = this.validateWorkflowArgs(workflow, data);
    validData.className = workflow.constructor.name;
    return this.workflowService.createRootWorkflow(validData, workspace, user, parentWorkflow);
  }
}
