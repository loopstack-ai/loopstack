import { RunPayload } from '@loopstack/contracts/schemas';
import type { WorkflowEntity } from '../entities';
import { WorkspaceEnvironmentContextDto } from './workspace-environment-context.dto';

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
  options: {
    stateless: boolean;
  };

  constructor(data: RunContext) {
    Object.assign(this, data);
  }
}
