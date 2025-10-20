import { BlockMetadata, WorkflowType } from '@loopstack/shared';
import { Expose, instanceToPlain } from 'class-transformer';
import { BlockStateDto, WorkflowStateDto } from '../dtos/workflow-state.dto';
import { WorkflowExecutionContextDto } from '../dtos/block-execution-context.dto';
import { BlockInterface } from '../interfaces/block.interface';

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




  #steps: Record<string, any> = {};

  addStepResult(key: string, value:any) {
    this.#steps[key] = value;
  }

  @Expose()
  get steps() {
    return this.#steps;
  }
}