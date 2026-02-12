import { WorkflowExecutionContextManager } from './execution-context-manager';

export function getTemplateVars(ctx: WorkflowExecutionContextManager) {
  const metadata = ctx.getMetadata();

  const templateVars: Record<string | symbol, unknown> = {};

  const argsKey = metadata.args?.name;
  if (argsKey) {
    templateVars[argsKey] = ctx.getArgs();
  }

  const contextKey = metadata.context?.name;
  if (contextKey) {
    templateVars[contextKey] = ctx.getContext();
  }

  const stateKey = metadata.state?.name;
  if (stateKey) {
    templateVars[stateKey] = ctx.getState();
  }

  const runtimeKey = metadata.runtime?.name;
  if (runtimeKey) {
    templateVars[runtimeKey] = ctx.getData();
  }

  return templateVars;
}
