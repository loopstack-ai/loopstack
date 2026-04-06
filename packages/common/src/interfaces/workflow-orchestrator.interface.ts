import { QueueResult, RunOptions } from '../base';
import type { WorkflowEntity } from '../entities';

export interface CallbackOptions {
  transition: string;
}

export interface WorkflowOrchestrator {
  queue(args?: Record<string, unknown>, options?: RunOptions): Promise<QueueResult>;
  callback(workflowId: string, payload: Record<string, unknown>, options: CallbackOptions): Promise<void>;
  complete(workflowEntity: WorkflowEntity): Promise<void>;
}
