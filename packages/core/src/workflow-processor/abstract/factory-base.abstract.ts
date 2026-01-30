import { BlockInterface } from '../../common';
import { Block } from './block.abstract';

export abstract class FactoryBase extends Block implements BlockInterface {
  public type: string = 'factory';
}
