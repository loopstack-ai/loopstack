import { Workflow } from '../workflow-processor';

export function getToolResult(
  result: Workflow,
  transitionId: string | number,
  toolId: string | number,
): any {
  return result.state.transitionResults?.[transitionId]?.toolResults?.[toolId];
}
