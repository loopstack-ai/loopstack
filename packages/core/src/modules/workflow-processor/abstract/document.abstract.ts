import { BlockMetadata, WorkflowType } from '@loopstack/shared';
import { BlockInterface } from '../interfaces/block.interface';
import { Expose, instanceToPlain } from 'class-transformer';
import { BlockStateDto } from '../dtos';
import { WorkflowExecutionContextDto } from '../dtos';
import { BlockRegistryItem } from '../services';

export abstract class Document implements BlockInterface {
  @Expose()
  public processor: string = 'document';

  public metadata: BlockMetadata;

  @Expose()
  public args: any;

  @Expose()
  public state: BlockStateDto;

  @Expose()
  public ctx: WorkflowExecutionContextDto;

  @Expose()
  public config: WorkflowType;

  init(
    registry: BlockRegistryItem,
    args: any,
    ctx: WorkflowExecutionContextDto,
  ) {
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
}
