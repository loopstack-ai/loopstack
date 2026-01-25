import { WorkflowType } from '@loopstack/contracts/types';
import { BlockInterface } from '../../common';
import { WorkflowExecution } from '../interfaces';
import { Block } from './block.abstract';

export abstract class WorkflowBase extends Block implements BlockInterface {
  public type: string = 'workflow';

  getConfig(): WorkflowType {
    return this.config as WorkflowType;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getResult(ctx: WorkflowExecution, args: any): any {}
}
