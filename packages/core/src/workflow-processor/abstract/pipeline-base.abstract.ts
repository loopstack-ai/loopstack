import { BlockInterface } from '../../common';
import { Block } from './block.abstract';

export class PipelineBase extends Block implements BlockInterface {
  public type: string = 'sequence';
}
