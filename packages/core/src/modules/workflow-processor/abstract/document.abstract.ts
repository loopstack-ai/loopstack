import { DocumentConfigType, Output } from '@loopstack/shared';
import { Block } from './block.abstract';
import { Record } from 'openai/core';

export abstract class Document<TConfig extends DocumentConfigType = DocumentConfigType> extends Block<TConfig> {

  type = 'document';

  @Output()
  args: Record<string, any>; // args prev. options

  public initDocument(
    inputs: Record<string, any>,
  ) {
    this.args = inputs || {};
  }
}