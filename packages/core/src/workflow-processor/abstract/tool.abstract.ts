import { BlockMetadata, HandlerCallResult } from '@loopstack/common';
import type { WorkflowType } from '@loopstack/contracts/types';
import { Expose, instanceToPlain } from 'class-transformer';
import {
  BlockInterface,
  BlockRegistryItem,
  BlockStateDto,
  ToolExecutionContextDto,
} from '../../common';
import { ProcessorFactory } from '../services';

export abstract class Tool<TArgs extends object = any>
  implements BlockInterface
{
  @Expose()
  public type: string = 'tool';

  public metadata: BlockMetadata;

  @Expose()
  public args: TArgs;

  @Expose()
  public state: BlockStateDto;

  @Expose()
  public ctx: ToolExecutionContextDto;

  @Expose()
  public config: WorkflowType;

  init(registry: BlockRegistryItem, args: any, ctx: ToolExecutionContextDto) {
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

  public abstract execute(
    args: any,
    ctx: ToolExecutionContextDto,
    factory: ProcessorFactory,
  ): Promise<HandlerCallResult>;

  result: any;

  getResult() {
    return instanceToPlain(this, {
      strategy: 'excludeAll',
      groups: ['result'],
      excludeExtraneousValues: true,
    });
  }
}
