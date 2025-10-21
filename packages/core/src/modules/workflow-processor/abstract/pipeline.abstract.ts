import { BlockMetadata, WorkflowType } from '@loopstack/shared';
import { Expose, instanceToPlain } from 'class-transformer';
import { BlockStateDto } from '../dtos/workflow-state.dto';
import { WorkflowExecutionContextDto } from '../dtos/block-execution-context.dto';
import { BlockInterface } from '../interfaces/block.interface';
import { BlockRegistryItem } from '../services';

export class Pipeline implements BlockInterface {

  @Expose()
  public processor: string = 'sequence';

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




  #steps: Record<string, any> = {};

  addStepResult(key: string, value:any) {
    this.#steps[key] = value;
  }

  @Expose()
  get steps() {
    return this.#steps;
  }
}