import {
  BlockInterface,
} from '../../common';
import { Block } from './block.abstract';
import { WorkflowType } from '@loopstack/contracts/types';

export abstract class WorkflowBase extends Block implements BlockInterface {
  public type: string = 'workflow';

  getConfig(): WorkflowType {
    return this.config as WorkflowType;
  }
}
