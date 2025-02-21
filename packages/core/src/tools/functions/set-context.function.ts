import { Injectable } from '@nestjs/common';
import { LoopFunction } from '../../processor/decorators/loop-function.decorator';
import { z } from 'zod';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { merge } from 'lodash';
import { FunctionInterface } from '../interfaces/function.interface';
import { ResultInterface } from '../../processor/interfaces/result.interface';

@Injectable()
@LoopFunction()
export class SetContextFunction implements FunctionInterface {
  schema = z.object({
    key: z.string(),
    value: z.any(),
  });

  apply(options: any, target: ContextInterface): ResultInterface {
    const validOptions = this.schema.parse(options);

    target[validOptions.key] = validOptions.value;
    return { context: target };
  }
}
