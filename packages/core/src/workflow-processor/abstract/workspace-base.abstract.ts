import { BlockInterface } from '../../common';
import { Block } from './block.abstract';

export abstract class WorkspaceBase extends Block implements BlockInterface {
  public type: string = 'workspace';
}
