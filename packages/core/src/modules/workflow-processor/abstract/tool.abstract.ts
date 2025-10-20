import {
  BlockMetadata,
  HandlerCallResult, WorkflowType,
} from '@loopstack/shared';
import { BlockInterface } from '../interfaces/block.interface';
import { Expose, instanceToPlain } from 'class-transformer';
import { WorkflowStateDto } from '../dtos/workflow-state.dto';
import { ToolExecutionContextDto, WorkflowExecutionContextDto } from '../dtos/block-execution-context.dto';

export abstract class Tool implements BlockInterface {
  @Expose()
  public processor: string = 'tool';

  public metadata: BlockMetadata;

  @Expose()
  public args: any;

  @Expose()
  public state: WorkflowStateDto;

  @Expose()
  public ctx: ToolExecutionContextDto;

  @Expose()
  public config: WorkflowType;

  init(metadata: BlockMetadata, args: any, ctx: ToolExecutionContextDto, data: Partial<WorkflowStateDto>) {
    this.metadata = metadata;
    this.args = args;
    this.ctx = ctx;
    this.state = new WorkflowStateDto(data);
  }

  get name(): string {
    return this.constructor.name;
  }

  public abstract execute(): Promise<HandlerCallResult>;

  result: any;

  getResult() {
    return instanceToPlain(this, {
      strategy: this.config.classTransformStrategy || 'excludeAll',
      groups: ['result'],
      excludeExtraneousValues: true,
    });
  }
}