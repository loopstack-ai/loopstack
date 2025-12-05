import { BlockMetadata } from '@loopstack/common';
import type { WorkflowType } from '@loopstack/contracts/types';
import { Expose, instanceToPlain } from 'class-transformer';
import {
  BlockInterface,
  BlockRegistryItem,
  BlockStateDto,
  WorkflowExecutionContextDto,
} from '../../common';

export abstract class Factory implements BlockInterface {
  @Expose()
  public type: string = 'factory';

  public metadata: BlockMetadata;

  @Expose()
  public args: any;

  @Expose()
  public state: BlockStateDto;

  @Expose()
  public ctx: WorkflowExecutionContextDto;

  @Expose()
  public config: WorkflowType;

  init(
    registry: BlockRegistryItem,
    args: any,
    ctx: WorkflowExecutionContextDto,
  ) {
    this.metadata = registry.metadata;
    this.args = args;
    this.ctx = ctx;
    this.state = new BlockStateDto({
      id: registry.name,
      error: false,
      stop: false,
    });
  }

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
