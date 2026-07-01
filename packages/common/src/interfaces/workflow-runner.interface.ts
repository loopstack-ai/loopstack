import type { WorkflowState } from '@loopstack/contracts/enums';
import type { BaseWorkflow } from '../base/base-workflow.js';

/**
 * Extracts the `TArgs` type from a `BaseWorkflow` subclass — the args shape you
 * pass to `WorkflowRunner.run(WorkflowClass, args, …)`.
 *
 * @public
 */
export type WorkflowArgs<W> = W extends BaseWorkflow<infer A> ? A : never;

/**
 * Options for starting a workflow via `WorkflowRunner` (`run` / `runSync`) —
 * `userId`, `appName`, and optional `workspaceId` / `labels`.
 *
 * @public
 */
export interface WorkflowRunnerOptions {
  /** User ID for execution context and access control */
  userId: string;
  /** App/workspace name — used for workspace find-or-create */
  appName: string;
  /** Workspace entity ID. If omitted, find-or-create by appName + userId */
  workspaceId?: string;
  /** Optional labels for categorizing/filtering workflow runs (e.g. ['session:abc-123']) */
  labels?: string[];
}

/**
 * Options for `WorkflowRunner.runSync` — extends `WorkflowRunnerOptions` with
 * `stateless` to skip all DB persistence.
 *
 * @public
 */
export interface WorkflowRunnerSyncOptions extends WorkflowRunnerOptions {
  /** When true, skip all DB persistence (no entities, no checkpoints, no documents) */
  stateless?: boolean;
}

/**
 * Result of `WorkflowRunner.run` — a workflow enqueued via BullMQ.
 *
 * @public
 */
export interface RunResult {
  workflowId: string;
  workspaceId: string;
  workerId: string;
}

/**
 * Result of `WorkflowRunner.runSync` with persistence — the final `status` and published `result`.
 *
 * @public
 */
export interface SyncRunResult extends RunResult {
  status: WorkflowState;
  result: unknown;
}

/**
 * Result of a stateless `WorkflowRunner.runSync` (no persistence) — `status` and published `result`.
 *
 * @public
 */
export interface StatelessRunResult {
  status: WorkflowState;
  result: unknown;
}
