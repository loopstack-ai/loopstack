/**
 * Per-job context passed as the first parameter to every workflow transition method.
 *
 * Built by the processor from the workflow entity / RunContext and passed explicitly.
 * The workflow never accesses ExecutionScope or CLS directly.
 */
export interface WorkflowContext {
  userId: string;
  workspaceId: string;
  workflowId: string;
  input: { args: unknown };
  execution: { place: string; retryCount: number };
}
