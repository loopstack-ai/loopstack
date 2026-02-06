import { WorkflowExecution } from '@loopstack/common';

export function getTemplateVars(args: unknown, ctx: WorkflowExecution) {
  // todo: restrict / expose ctx.state contents
  return {
    ...ctx.state.getAll(),
    metadata: ctx.state.getAllMetadata(),
    transition: ctx.runtime.transition,
    args,
  };
}
