import { Output, WorkflowType, TransitionMetadataInterface } from '@loopstack/shared';
import { Block } from './block.abstract';
import { cloneDeep } from 'lodash';
import { Record } from 'openai/core';
import { TransitionResultLookup } from '../services';

export abstract class Workflow<TConfig extends WorkflowType = WorkflowType> extends Block<TConfig> {

  type = 'workflow';

  @Output()
  args: Record<string, any>; // args prev. options

  @Output()
  currentTransition: TransitionMetadataInterface | null;

  @Output()
  transitionResults: TransitionResultLookup;

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
    this.args = inputs || {};
    this.currentTransition = null;

    if (data) {
      this.populate(data);
    }
  }

  public setTransition(transition: TransitionMetadataInterface | null) {
    this.currentTransition = transition;
  }
}