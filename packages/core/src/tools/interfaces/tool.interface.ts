import { ContextInterface } from '../../processor/interfaces/context.interface';
import { ResultInterface } from '../../processor/interfaces/result.interface';

export interface ToolInterface {
  apply(
    options: any,
    target: ContextInterface,
    source: ResultInterface,
  ): ResultInterface;
}
