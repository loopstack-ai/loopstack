import { RunPayload } from '@loopstack/contracts/schemas';
import type { WorkflowEntity } from '../entities/index.js';
import type { StatelessExecutionState } from '../interfaces/workflow-metadata.interface.js';

export interface InternalRunContext {
  root: string;
  userId: string;
  workspaceId: string;
  workflowId?: string;
  labels: string[];
  payload: RunPayload;
  workflowContext?: Record<string, any>;
  /** The root workflow entity — available for stateful workflow execution */
  workflowEntity?: WorkflowEntity;
  /** Resume carrier for a parked stateless run — pair with `payload.transition`. */
  statelessState?: StatelessExecutionState;
  options: {
    stateless: boolean;
  };
}
