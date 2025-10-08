import { Output, PipelineFactoryConfigType } from '@loopstack/shared';
import { Block } from './block.abstract';
import { Record } from 'openai/core';

export abstract class Factory<TConfig extends PipelineFactoryConfigType = PipelineFactoryConfigType> extends Block<TConfig> {

  type = 'factory';

  @Output()
  args: Record<string, any>;

  @Output()
  itemLabel: string;

  @Output()
  itemIndex: number;

  public initFactory(
    args: Record<string, any>,
  ) {
    this.args = args || {};
  }

}