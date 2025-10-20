import { BlockMetadata, WorkflowType } from '@loopstack/shared';
import { WorkflowStateDto } from '../dtos/workflow-state.dto';
import { WorkflowExecutionContextDto } from '../dtos/block-execution-context.dto';
import { Expose, instanceToPlain, Type } from 'class-transformer';
import { BlockInterface } from '../interfaces/block.interface';

export abstract class Workflow implements BlockInterface {

  public processor: string = 'workflow';

  public metadata: BlockMetadata;

  @Expose()
  public args: any;

  @Expose()
  @Type(() => WorkflowStateDto)
  public state: WorkflowStateDto;

  @Expose()
  @Type(() => WorkflowExecutionContextDto)
  public ctx: WorkflowExecutionContextDto;

  @Expose()
  public config: WorkflowType;

  init(metadata: BlockMetadata, args: any, ctx: WorkflowExecutionContextDto, data: Partial<WorkflowStateDto>) {
    this.metadata = metadata;
    this.args = args;
    this.ctx = ctx;
    this.state = new WorkflowStateDto(data);
  }

  @Expose()
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

  isInputProperty(metadata: BlockMetadata, name: string) {
    return metadata.inputProperties.includes(name);
  }
}