import {
  ExecutionContext,
  HandlerCallResult, Output,
  ToolConfigType,
  TransitionMetadataInterface,
  WorkflowEntity,
} from '@loopstack/shared';
import { z } from 'zod';
import { Block } from './block.abstract';
import { Record } from 'openai/core';

export abstract class Tool<TConfig extends ToolConfigType = ToolConfigType> extends Block<TConfig> {

  type = 'tool';

  @Output()
  args: Record<string, any>; // args prev. options

  @Output()
  transition: TransitionMetadataInterface;

  @Output()
  result: HandlerCallResult;

  public initTool(
    args: Record<string, any>,
    transition: TransitionMetadataInterface,
  ) {
    this.args = args || {};
    this.transition = transition;
  }

  async apply(
    args: any,
    workflow: WorkflowEntity,
  ): Promise<HandlerCallResult> {
    const executionContext = new ExecutionContext(
      this.context,
      args,
      workflow,
      this.transition,
      this.args,
    );

    return this.execute(executionContext);
  }

  protected abstract execute<TSchema extends z.ZodType>(
    ctx: ExecutionContext<z.infer<TSchema>>,
  ): Promise<HandlerCallResult>;
}