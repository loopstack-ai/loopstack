import {
  ContextInterface,
  ExecutionContext,
  HandlerCallResult,
  TransitionMetadataInterface,
  WorkflowEntity,
} from '@loopstack/shared';
import { z } from 'zod';

export abstract class Executable {
  async apply(
    args: any,
    workflow: WorkflowEntity,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
    parentArguments: any,
  ): Promise<HandlerCallResult> {
    const executionContext = new ExecutionContext(
      args,
      workflow,
      context,
      transitionData,
      parentArguments,
    );

    return this.execute(executionContext);
  }

  protected abstract execute<TSchema extends z.ZodType>(
    ctx: ExecutionContext<z.infer<TSchema>>,
  ): Promise<HandlerCallResult>;
}