import { RunPayload } from '@loopstack/contracts/schemas';
import type { WorkflowEntity } from '../entities/index.js';
import type { WorkspaceInterface } from '../interfaces/index.js';
import { WorkspaceEnvironmentContextDto } from './workspace-environment-context.dto.js';

export class RunContext {
  root!: string;
  userId!: string;
  workspaceId!: string;
  workflowId?: string;
  labels!: string[];
  payload: RunPayload;
  workflowContext?: Record<string, any>;
  workspaceEnvironments?: WorkspaceEnvironmentContextDto[];
  /** The root workflow entity — available for stateful workflow execution */
  workflowEntity?: WorkflowEntity;
  /** The workspace NestJS singleton instance — provides workspace-level tools and workflows */
  workspaceInstance?: WorkspaceInterface;
  options: {
    stateless: boolean;
  };

  constructor(data: RunContext) {
    Object.assign(this, data);
  }
}
