import {
  ExecutionContext,
  HandlerCallResult,
  ToolConfigType,
  TransitionMetadataInterface,
  WorkflowEntity,
} from '@loopstack/shared';
import { z } from 'zod';
import { Block } from './block.abstract';
import { Record } from 'openai/core';

export abstract class Tool<TConfig extends ToolConfigType = ToolConfigType> extends Block<TConfig> {
  // inputs
  #inputs: Record<string, any>; // args prev. options

  #transition: TransitionMetadataInterface;

  result: HandlerCallResult;

  public initTool(
    inputs: Record<string, any>,
    transition: TransitionMetadataInterface,
  ) {
    this.#inputs = inputs || {};
    this.#transition = transition;
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
      this.inputs,
    );

    return this.execute(executionContext);
  }

  protected abstract execute<TSchema extends z.ZodType>(
    ctx: ExecutionContext<z.infer<TSchema>>,
  ): Promise<HandlerCallResult>;

  get inputs(): Record<string, any> {
    return this.#inputs;
  }

  get transition(): TransitionMetadataInterface {
    return this.#transition;
  }
}