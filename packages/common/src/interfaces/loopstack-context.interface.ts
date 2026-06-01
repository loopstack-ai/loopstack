/**
 * Read-only per-job framework context.
 *
 * Set once by the processor at job start, read by ToolPipelineService,
 * interceptors, and tools (via `this.ctx` on BaseTool).
 */
export interface LoopstackContext {
  userId: string;
  workspaceId: string;
  workflowId: string;
  run: { args: unknown };
}
