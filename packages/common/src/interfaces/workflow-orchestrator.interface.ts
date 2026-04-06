import { QueueResult, RunOptions } from '../base';

export interface WorkflowOrchestrator {
  queue(args?: Record<string, unknown>, options?: RunOptions): Promise<QueueResult>;
}
