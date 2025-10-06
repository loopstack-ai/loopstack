import { Block } from './block.abstract';
import { ContextInterface, PipelineType } from '@loopstack/shared';
import { Record } from 'openai/core';

export abstract class Pipeline<TConfig extends PipelineType = PipelineType> extends Block<TConfig> {
  // inputs
  #inputs: Record<string, any>; // args prev. options

  public initPipeline(
    inputs: Record<string, any>,
  ) {
    this.#inputs = inputs || {};
  }

  get inputs(): Record<string, any> {
    return this.#inputs;
  }
}