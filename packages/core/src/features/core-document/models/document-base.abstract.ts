import { Block } from '../../../workflow-processor/abstract/block.abstract';

export abstract class DocumentBase extends Block {
  public type: string = 'document';
}
