import { Expose, Type, instanceToPlain } from 'class-transformer';
import { BlockInterface, BlockStateDto, WorkspaceExecutionContextDto } from '../../common';
import { Block } from './block.abstract';

export abstract class WorkspaceBase extends Block implements BlockInterface {
  public type: string = 'workspace';

  @Expose()
  public args: any;

  @Expose()
  @Type(() => BlockStateDto)
  public state: BlockStateDto;

  @Expose()
  public ctx: WorkspaceExecutionContextDto;

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
