import { WorkflowExecutionContextDto } from '@loopstack/core';

export function getToolResult(
  ctx: WorkflowExecutionContextDto,
  transitionId: string | number,
  toolId: string | number,
): any {
  return ctx.state.transitionResults?.[transitionId]?.toolResults?.[toolId];
}
