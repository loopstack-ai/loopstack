import type { WorkflowType } from '@loopstack/contracts/types';
import { BlockMetadata } from '@loopstack/common';
import { Expose, instanceToPlain, Type } from 'class-transformer';
import {
  BlockInterface,
  BlockRegistryItem,
  BlockStateDto,
  WorkflowExecutionContextDto,
  WorkflowStateDto,
} from '../../common';

export abstract class Workflow<
  TState extends WorkflowStateDto | BlockStateDto = WorkflowStateDto,
> implements BlockInterface
{
  public type: string = 'workflow';

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
    }) as TState;
  }

  @Expose()
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

  isInputProperty(metadata: BlockMetadata, name: string) {
    return metadata.inputProperties.includes(name);
  }
}
