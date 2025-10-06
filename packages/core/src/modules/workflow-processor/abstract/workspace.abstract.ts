import { ContextInterface, PipelineType } from '@loopstack/shared';
import { Block } from './block.abstract';

export abstract class Workspace<TConfig extends PipelineType = PipelineType> extends Block<TConfig> {
  // inputs
  #inputs: Record<string, any>; // args prev. options

  public initWorkspace(
    inputs: Record<string, any>,
  ) {
    this.#inputs = inputs || {};
  }

  get inputs(): Record<string, any> {
    return this.#inputs;
  }
}