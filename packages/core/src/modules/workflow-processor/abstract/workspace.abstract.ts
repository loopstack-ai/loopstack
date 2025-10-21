import { BlockMetadata, WorkspaceType } from '@loopstack/shared';
import { Expose, instanceToPlain, Type } from 'class-transformer';
import { BlockStateDto } from '../dtos';
import {
  WorkflowExecutionContextDto,
  WorkspaceExecutionContextDto,
} from '../dtos';
import { BlockInterface } from '../interfaces/block.interface';
import { BlockRegistryItem } from '../services';

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
