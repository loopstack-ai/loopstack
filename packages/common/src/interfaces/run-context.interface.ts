/**
 * Unified per-job framework context.
 *
 * Used by both tools (passed as `ctx` parameter to `handle()`) and workflows
 * (passed as the trailing parameter to transition methods).
 *
 * - `args` — validated workflow input args (frozen at job start)
 * - `execution` — present in workflow transitions, absent in tools
 */
export interface RunContext<TArgs = unknown> {
  userId: string;
  workspaceId: string;
  workflowId: string;
  args: TArgs;
  execution?: { place: string; retryCount: number };
}
