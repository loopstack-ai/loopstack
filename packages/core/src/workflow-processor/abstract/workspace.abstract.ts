import type { WorkspaceType } from '@loopstack/contracts/types';
import { BlockMetadata } from '@loopstack/common';
import { Expose, instanceToPlain, Type } from 'class-transformer';
import {
  BlockInterface,
  BlockRegistryItem,
  BlockStateDto,
  WorkflowExecutionContextDto,
  WorkspaceExecutionContextDto,
} from '../../common';

export abstract class Workspace implements BlockInterface {
  public type: string = 'workspace';

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
      strategy: 'excludeAll',
      groups: ['result'],
      excludeExtraneousValues: true,
    });
  }
}
