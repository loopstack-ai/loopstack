import { RunContext } from '../dtos/index.js';
import { WorkflowInterface, WorkspaceInterface } from './block.interface.js';
import { WorkflowMetadataInterface } from './workflow-metadata.interface.js';

/**
 * Unified execution context available on both tools and workflows via `this.ctx`.
 *
 * Provides read-only access to per-execution data. The framework wires this
 * as a lazy proxy that reads from the AsyncLocalStorage-backed ExecutionScope,
 * so it always reflects the current execution context.
 */
export interface FrameworkContext {
  /** Current run context (userId, workspaceId, workflowId, labels, etc.) */
  readonly context: RunContext;

  /** Workflow metadata (documents, place, transition, status, etc.) */
  readonly runtime: WorkflowMetadataInterface;

  /** Validated workflow args (from @Input schema) */
  readonly args: Readonly<Record<string, unknown> | undefined>;

  /** Validated workflow config (from @InjectWorkflow defaults, validated against configSchema) */
  readonly config: Readonly<Record<string, unknown> | undefined>;

  /** Parent workflow instance — for dynamic tool/document lookups */
  readonly parent: WorkflowInterface;

  /** Workspace instance — provides workspace-level tools as fallback for tool resolution */
  readonly workspace?: WorkspaceInterface;
}
