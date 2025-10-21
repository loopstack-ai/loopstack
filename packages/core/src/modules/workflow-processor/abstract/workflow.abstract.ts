import { BlockMetadata, WorkflowType } from '@loopstack/shared';
import { BlockStateDto, WorkflowStateDto } from '../dtos/workflow-state.dto';
import { WorkflowExecutionContextDto } from '../dtos/block-execution-context.dto';
import { Expose, instanceToPlain, Type } from 'class-transformer';
import { BlockInterface } from '../interfaces/block.interface';
import { BlockRegistryItem } from '../services';

export abstract class Workflow<TState extends WorkflowStateDto | BlockStateDto = WorkflowStateDto> implements BlockInterface {

  public processor: string = 'workflow';

  public metadata: BlockMetadata;

  @Expose()
  public args: any;

  @Expose()
  @Type(() => WorkflowStateDto)
  public state: TState;

  @Expose()
  @Type(() => WorkflowExecutionContextDto)
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
    }) as TState;
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