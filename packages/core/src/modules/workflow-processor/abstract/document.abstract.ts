import { DocumentConfigType } from '@loopstack/shared';
import { Block } from './block.abstract';
import { Record } from 'openai/core';

export abstract class Document<TConfig extends DocumentConfigType = DocumentConfigType> extends Block<TConfig> {
  // inputs
  #inputs: Record<string, any>; // args prev. options

  public initDocument(
    inputs: Record<string, any>,
  ) {
    this.#inputs = inputs || {};
  }

  get inputs(): Record<string, any> {
    return this.#inputs;
  }
}