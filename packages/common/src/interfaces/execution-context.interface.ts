import type { RunPayload } from '@loopstack/contracts/schemas';
import type { BaseApp } from '../base/index.js';
import type { WorkflowEntity } from '../entities/index.js';
import { WorkflowInterface } from './block.interface.js';
import { WorkflowMetadataInterface } from './workflow-metadata.interface.js';

/**
 * Per-execution run context — data that changes with each workflow run.
 *
 * Available via `this.ctx.run` inside workflows and tools.
 */
export interface WorkflowRunContext {
  /** The workflow entity ID (undefined for stateless runs) */
  readonly workflowId?: string;

  /** The root workflow alias */
  readonly root: string;

  /** Labels copied from the workflow entity */
  readonly labels: string[];

  /** BullMQ task payload — contains transition data for wait-transition resumes */
  readonly payload: RunPayload;

  /** Arbitrary per-workflow context from the workflow entity's `context` column */
  readonly context?: Record<string, unknown>;

  /** The full workflow entity (stateful runs only) */
  readonly entity?: WorkflowEntity;

  /** Execution mode flags */
  readonly options: { stateless: boolean };

  /** Validated workflow args (from @Workflow({ schema }) validation) */
  readonly args: Readonly<Record<string, unknown> | undefined>;

  /** Validated workflow config (from @InjectWorkflow defaults, validated against configSchema) */
  readonly config: Readonly<Record<string, unknown> | undefined>;
}

/**
 * Unified execution context available on both tools and workflows via `this.ctx`.
 *
 * Provides read-only access to per-execution data. The framework wires this
 * as a lazy proxy that reads from the AsyncLocalStorage-backed ExecutionScope,
 * so it always reflects the current execution context.
 *
 * Generic parameter:
 * - `TApp` — the concrete app type. Defaults to `BaseApp` which
 *   provides `userId`, `workspaceId`, and `environments`. Pass your app class
 *   to access app-specific composition (injected workflows/tools).
 */
export interface FrameworkContext<TApp extends BaseApp = BaseApp> {
  /** Proxied app instance — provides execution context (userId, workspaceId) and app composition */
  readonly app: TApp;

  /** Per-run execution context (workflowId, args, config, labels, payload, etc.) */
  readonly run: WorkflowRunContext;

  /** Workflow metadata (documents, place, transition, status, etc.) */
  readonly runtime: WorkflowMetadataInterface;

  /** The workflow instance (proxied) — used by tools for dynamic tool resolution */
  readonly workflow: WorkflowInterface;
}
