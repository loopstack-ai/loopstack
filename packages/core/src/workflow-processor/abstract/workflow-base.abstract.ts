import { BlockInterface } from '../../common';
import { WorkflowExecution } from '../interfaces';
import { Block } from './block.abstract';

export abstract class WorkflowBase extends Block implements BlockInterface {
  public type: string = 'workflow';

  getResult(_ctx: WorkflowExecution, _args: any): any {}
}
