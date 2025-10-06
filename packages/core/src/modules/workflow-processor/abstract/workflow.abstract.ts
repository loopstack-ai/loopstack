import { ContextInterface, StateMachineType, TransitionMetadataInterface } from '@loopstack/shared';
import { Block } from './block.abstract';
import { cloneDeep } from 'lodash';
import { Record } from 'openai/core';

export abstract class StateMachine<TConfig extends StateMachineType = StateMachineType> extends Block<TConfig> {
  // inputs
  #inputs: Record<string, any>; // args prev. options

  #transition: TransitionMetadataInterface | null;

  // old:
  // prevData?: Record<string, Record<string, any>> | null;
  // aliasData?: Record<string, string[]>;
  // contextVariables?: any;

  // todo: remove alias, try eliminating context Variables

  private populate(data: any) {
    for (const [key, value] of Object.entries(data)) {
      if (key in this) {
        (this as any)[key] = cloneDeep(value);
      } else {
        console.warn(`Property ${key} not found on ${this.constructor.name}`);
      }
    }
  }

  public initWorkflow(
    inputs: Record<string, any>,
    data: any,
  ) {
    this.#inputs = inputs || {};
    this.#transition = null;

    if (data) {
      this.populate(data);
    }
  }

  public setTransition(transition: TransitionMetadataInterface | null) {
    this.#transition = transition;
  }

  get inputs(): Record<string, any> {
    return this.#inputs;
  }

  get currentTransition(): TransitionMetadataInterface | null {
    return this.#transition;
  }
}