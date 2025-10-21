import { BlockMetadata, WorkflowType } from '@loopstack/shared';
import { Expose, instanceToPlain } from 'class-transformer';
import { BlockStateDto, WorkflowStateDto } from '../dtos/workflow-state.dto';
import { WorkflowExecutionContextDto } from '../dtos/block-execution-context.dto';
import { BlockInterface } from '../interfaces/block.interface';
import { BlockRegistryItem } from '../services';

export abstract class Factory implements BlockInterface {

  @Expose()
  public processor: string = 'factory';

  public metadata: BlockMetadata;

  @Expose()
  public args: any;

  @Expose()
  public state: BlockStateDto;

  @Expose()
  public ctx: WorkflowExecutionContextDto;

  @Expose()
  public config: WorkflowType;

  init(registry: BlockRegistryItem, args: any, ctx: WorkflowExecutionContextDto) {
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
      strategy: this.config.classTransformStrategy || 'excludeAll',
      groups: ['result'],
      excludeExtraneousValues: true,
    });
  }

  #items: Record<string, any> = {};

  addItemResult(key: string, value:any) {
    this.#items[key] = value;
  }

  @Expose()
  get items() {
    return this.#items;
  }

}