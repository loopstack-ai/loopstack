import type { WorkflowState } from '@loopstack/contracts/enums';
import type { BaseWorkflow } from '../base/base-workflow.js';

/** Extracts the TArgs type from a BaseWorkflow subclass */
export type WorkflowArgs<W> = W extends BaseWorkflow<infer A> ? A : never;

/** Options for starting a new workflow via WorkflowRunner (async or sync) */
export interface WorkflowRunnerOptions {
  /** User ID for execution context and access control */
  userId: string;
  /** App/workspace name — used for workspace find-or-create */
  appName: string;
  /** Workspace entity ID. If omitted, find-or-create by appName + userId */
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
