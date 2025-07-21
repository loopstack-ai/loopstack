export class TaskExecutionEvent {
  constructor(
    public readonly taskId: string,
    public readonly workspaceId: string,
    public readonly rootPipelineId: string,
    public readonly name: string,
    public readonly payload: Record<string, any>,
  ) {}
}