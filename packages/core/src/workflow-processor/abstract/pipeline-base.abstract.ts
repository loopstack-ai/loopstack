import { Expose, instanceToPlain } from 'class-transformer';
import {
  BlockInterface,
  BlockStateDto,
  WorkflowExecutionContextDto,
} from '../../common';
import { Block } from './block.abstract';

export class PipelineBase extends Block implements BlockInterface {
  @Expose()
  public type: string = 'sequence';

  @Expose()
  public args: any;

  @Expose()
  public state: BlockStateDto;

  @Expose()
  public ctx: WorkflowExecutionContextDto;

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

  #steps: Record<string, any> = {};

  addStepResult(key: string, value: any) {
    this.#steps[key] = value;
  }

  @Expose()
  get steps() {
    return this.#steps;
  }
}
