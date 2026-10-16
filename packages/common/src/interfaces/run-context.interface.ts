/**
 * Unified per-job framework context.
 *
 * Used by both tools (passed as `ctx` parameter to `handle()`) and workflows
 * (passed as the trailing parameter to transition methods).
 *
 * - `args` — validated workflow input args (frozen at job start)
 * - `execution` — present in workflow transitions, absent in tools
 *
 * @public
 */
export interface RunContext<TArgs = unknown> {
  userId: string;
  workspaceId: string;
  workflowId: string;
  args: TArgs;
  /** Aborted when the run is torn down (e.g. the transition times out). */
  signal: AbortSignal;
  /**
   * Present in workflow transitions. `error` is why the run is at this place, when the last thing that
   * happened here was a failure: the message of the transition that was routed here by its `errorPlace`, or
   * of the one that failed in place and is being retried. Absent otherwise.
   */
  execution?: { place: string; retryCount: number; error?: string };
}
