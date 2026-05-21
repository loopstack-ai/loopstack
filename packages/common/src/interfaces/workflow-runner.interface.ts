import type { Type } from '@nestjs/common';
import type { WorkflowState } from '@loopstack/contracts/enums';
import type { BaseWorkflow } from '../base/base-workflow.js';
import type { BaseApp } from '../base/index.js';

/** Extracts the TArgs type from a BaseWorkflow subclass */
export type WorkflowArgs<W> = W extends BaseWorkflow<infer A> ? A : never;

/** Options for starting a new workflow via WorkflowRunner (async or sync) */
export interface WorkflowRunnerOptions {
  /** User ID for execution context and access control */
  userId: string;
  /** The app class that owns this workflow — determines which workflows/tools are available */
  app: Type<BaseApp>;
  /** Workspace entity ID. If omitted, find-or-create by app className + userId */
  workspaceId?: string;
}

/** Options for synchronous workflow execution via WorkflowRunner */
export interface WorkflowRunnerSyncOptions extends WorkflowRunnerOptions {
  /** When true, skip all DB persistence (no entities, no checkpoints, no documents) */
  stateless?: boolean;
}

/** Result of async workflow execution (queued via BullMQ) */
export interface RunResult {
  workflowId: string;
  workspaceId: string;
  workerId: string;
}

/** Result of synchronous workflow execution (inline, with persistence) */
export interface SyncRunResult extends RunResult {
  status: WorkflowState;
  result: unknown;
}

/** Result of stateless synchronous execution (no persistence) */
export interface StatelessRunResult {
  status: WorkflowState;
  result: unknown;
}
