import { BlockMetadata, WorkflowType } from '@loopstack/shared';
import { BlockInterface } from '../interfaces/block.interface';
import { Expose, instanceToPlain } from 'class-transformer';
import { WorkflowStateDto } from '../dtos/workflow-state.dto';
import { WorkflowExecutionContextDto } from '../dtos/block-execution-context.dto';

export abstract class Document implements BlockInterface {
  @Expose()
  public processor: string = 'document';

  public metadata: BlockMetadata;

  @Expose()
  public args: any;

  @Expose()
  public state: WorkflowStateDto;

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
}