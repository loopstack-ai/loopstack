import { ContextInterface } from '../../processor/interfaces/context.interface';
import { ResultInterface } from '../../processor/interfaces/result.interface';

export interface FunctionInterface {
  apply(
    options: any,
    target: ContextInterface,
    context: ContextInterface,
  ): ResultInterface;
}
