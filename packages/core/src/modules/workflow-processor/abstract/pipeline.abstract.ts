import { Block } from './block.abstract';
import { Output, PipelineSequenceType } from '@loopstack/shared';
import { Record } from 'openai/core';

export abstract class Pipeline<TConfig extends PipelineSequenceType = PipelineSequenceType> extends Block<TConfig> {

  type = 'sequence';

  @Output()
  args: Record<string, any>; // args prev. options

  public initPipeline(
    inputs: Record<string, any>,
  ) {
    this.args = inputs || {};
  }

}