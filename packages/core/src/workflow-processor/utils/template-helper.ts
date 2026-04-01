import { WorkflowExecutionContextManager } from './execution-context-manager';

export function getTemplateVars(ctx: WorkflowExecutionContextManager) {
  const templateVars: Record<string, unknown> = {
    args: ctx.getArgs(),
    context: ctx.getContext(),
    runtime: ctx.getData(),
    state: ctx.getState(),
  };

  return templateVars;
}
