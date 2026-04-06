import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import {
  BlockInterface,
  WorkflowEntity,
  WorkflowInterface,
  WorkspaceEntity,
  getBlockArgsSchema,
  getBlockWorkflow,
  getBlockWorkflows,
} from '@loopstack/common';
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

  private resolveWorkflow(
    alias: string,
    workspaceInstance: BlockInterface,
    parentWorkflowInstance?: WorkflowInterface | BlockInterface,
  ): WorkflowInterface {
    this.logger.debug(
      `[DEBUG] resolveWorkflow: alias=${alias}, workspace=${workspaceInstance.constructor.name}, parent=${parentWorkflowInstance?.constructor?.name ?? 'UNDEFINED'}`,
    );

    // Try parent workflow first
    if (parentWorkflowInstance) {
      const parentWorkflows = getBlockWorkflows(parentWorkflowInstance);
      this.logger.debug(`[DEBUG] Parent workflows available: [${parentWorkflows.join(', ')}]`);
      const workflow = getBlockWorkflow<WorkflowInterface>(parentWorkflowInstance, alias);
      if (workflow) {
        this.logger.debug(`[DEBUG] Found "${alias}" on parent workflow`);
        return workflow;
      }
      this.logger.debug(`[DEBUG] "${alias}" NOT found on parent workflow`);
    }

    // Fallback: resolve from workspace
    const workspaceWorkflows = getBlockWorkflows(workspaceInstance);
    this.logger.debug(`[DEBUG] Workspace workflows available: [${workspaceWorkflows.join(', ')}]`);
    const workflow = getBlockWorkflow<WorkflowInterface>(workspaceInstance, alias);
    if (workflow) {
      return workflow;
    }

    const parentName = parentWorkflowInstance?.constructor.name;
    throw new Error(
      `Workflow ${alias} not found` +
        (parentName ? ` on parent workflow ${parentName} or` : ' on') +
        ` workspace ${workspaceInstance.constructor.name}.`,
    );
  }

  async create(
    workspaceWhere: FindOptionsWhere<WorkspaceEntity>,
    data: Partial<WorkflowEntity>,
    user: string,
    parentWorkflowId?: string,
    parentWorkflowInstance?: WorkflowInterface | BlockInterface,
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

    const workflow = this.resolveWorkflow(data.alias, workspaceInstance, parentWorkflowInstance);
    const validData = this.validateWorkflowArgs(workflow, data);
    // alias stays as property name (for hierarchy resolution), className stores the class name (for config lookups)
    validData.className = workflow.constructor.name;
    return this.workflowService.createRootWorkflow(validData, workspace, user, parentWorkflow);
  }
}
