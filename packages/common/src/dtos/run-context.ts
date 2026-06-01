import { RunPayload } from '@loopstack/contracts/schemas';
import type { WorkflowEntity } from '../entities/index.js';

export interface RunContext {
  root: string;
  userId: string;
  workspaceId: string;
  workflowId?: string;
  labels: string[];
  payload: RunPayload;
  workflowContext?: Record<string, any>;
  /** The root workflow entity — available for stateful workflow execution */
  workflowEntity?: WorkflowEntity;
  options: {
    stateless: boolean;
  };
}
