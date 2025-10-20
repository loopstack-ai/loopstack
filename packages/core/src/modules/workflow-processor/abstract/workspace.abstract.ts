import { BlockMetadata, WorkspaceType } from '@loopstack/shared';
import { Expose, instanceToPlain, Type } from 'class-transformer';
import { BlockStateDto, WorkflowStateDto } from '../dtos/workflow-state.dto';
import { WorkflowExecutionContextDto, WorkspaceExecutionContextDto } from '../dtos/block-execution-context.dto';
import { BlockInterface } from '../interfaces/block.interface';

export abstract class Workspace implements BlockInterface {
  public processor: string = 'workspace';

  public metadata: BlockMetadata;

  @Expose()
  public args: any;

  @Expose()
  @Type(() => BlockStateDto)
  public state: BlockStateDto;

  @Expose()
  public ctx: WorkspaceExecutionContextDto;

  @Expose()
  public config: WorkspaceType;

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