import { getBlockArgsSchema } from '@loopstack/common';
import { BlockInterface } from '../../common';
import { WorkflowExecution } from '../interfaces';

export abstract class Block<TArgs extends object = any> implements BlockInterface {
  public type: string = 'undefined';

  get name(): string {
    return this.constructor.name;
  }

  public getTemplateVars(args: unknown, ctx: WorkflowExecution) {
    // todo: restrict / expose ctx.state contents
    return {
      ...ctx.state.getAll(),
      metadata: ctx.state.getAllMetadata(),
      transition: ctx.runtime.transition,
      args,
    };
  }

  validate(args: unknown): TArgs {
    const schema = getBlockArgsSchema(this);
    return schema ? (schema.parse(args) as TArgs) : (args as TArgs);
  }
}
