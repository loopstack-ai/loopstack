import { Expose, instanceToPlain } from 'class-transformer';
import {
  BlockInterface,
  BlockStateDto,
  WorkflowExecutionContextDto,
} from '../../common';
import { Block } from './block.abstract';

export abstract class FactoryBase extends Block implements BlockInterface {
  @Expose()
  public type: string = 'factory';

  @Expose()
  public args: any;

  @Expose()
  public state: BlockStateDto;

  @Expose()
  public ctx: WorkflowExecutionContextDto;

  get name(): string {
    return this.constructor.name;
  }

  getResult() {
    return instanceToPlain(this, {
      strategy: 'excludeAll',
      groups: ['result'],
      excludeExtraneousValues: true,
    });
  }

  #items: Record<string, any> = {};

  addItemResult(key: string, value: any) {
    this.#items[key] = value;
  }

  @Expose()
  get items() {
    return this.#items;
  }
}
