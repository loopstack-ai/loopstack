import { Injectable } from '@nestjs/common';
import { LoopFunction } from '../../processor/decorators/loop-function.decorator';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { _ } from 'lodash';
import { FunctionInterface } from '../interfaces/function.interface';
import { ResultInterface } from '../../processor/interfaces/result.interface';

@Injectable()
@LoopFunction()
export class ForwardChildContextFunction implements FunctionInterface {
  apply(
    options: any,
    target: ContextInterface,
    context: ContextInterface,
  ): ResultInterface {
    return { context: _.merge({}, target, _.omit(context, options.omit)) };
  }
}
