import { BlockMetadata, WorkflowType } from '@loopstack/shared';
import { Expose, instanceToPlain } from 'class-transformer';
import { BlockStateDto, WorkflowStateDto } from '../dtos/workflow-state.dto';
import { WorkflowExecutionContextDto } from '../dtos/block-execution-context.dto';
import { BlockInterface } from '../interfaces/block.interface';

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

  init(metadata: BlockMetadata, args: any, ctx: WorkflowExecutionContextDto, data: Partial<WorkflowStateDto>) {
    this.metadata = metadata;
    this.args = args;
    this.ctx = ctx;
    this.state = new WorkflowStateDto(data);
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