import type { Type } from '@nestjs/common';
import { QueueResult, RunOptions } from '../base/index.js';
import type { WorkflowEntity } from '../entities/index.js';

export interface ResumeOptions {
  transition: string;
}

export interface WorkflowOrchestrator {
  queue(workflowClass: Type, args?: Record<string, unknown>, options?: RunOptions): Promise<QueueResult>;
  resume(workflowId: string, payload: Record<string, unknown>, options: ResumeOptions): Promise<void>;
  complete(workflowEntity: WorkflowEntity): Promise<void>;
  cancel(workflowId: string): Promise<void>;
  cancelChildren(parentWorkflowId: string): Promise<void>;
}
