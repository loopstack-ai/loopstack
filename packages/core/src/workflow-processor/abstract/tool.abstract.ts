import {
  BlockMetadata,
  HandlerCallResult,
  WorkflowType,
} from '@loopstack/shared';
import { BlockInterface } from '../interfaces/block.interface';
import { Expose, instanceToPlain } from 'class-transformer';
import { BlockStateDto } from '../dtos';
import { ToolExecutionContextDto } from '../dtos';
import { BlockRegistryItem, ProcessorFactory } from '../services';

export abstract class Tool<TArgs extends object = any> implements BlockInterface {
  @Expose()
  public processor: string = 'tool';

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

  public abstract execute(options: { factory: ProcessorFactory; }): Promise<HandlerCallResult>;

  result: any;

  getResult() {
    return instanceToPlain(this, {
      strategy: this.config.classTransformStrategy || 'excludeAll',
      groups: ['result'],
      excludeExtraneousValues: true,
    });
  }
}
