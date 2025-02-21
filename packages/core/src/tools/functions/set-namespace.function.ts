import { Injectable } from '@nestjs/common';
import { LoopFunction } from '../../processor/decorators/loop-function.decorator';
import { z } from 'zod';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { FunctionInterface } from '../interfaces/function.interface';
import { ResultInterface } from '../../processor/interfaces/result.interface';

@Injectable()
@LoopFunction()
export class SetNamespaceFunction implements FunctionInterface {
  schema = z.object({
    key: z.string(),
    value: z.any(),
  });

  apply(options: any, target: ContextInterface): ResultInterface {
    const validOptions = this.schema.parse(options);

    if (!target.namespaces) {
      target.namespaces = {};
    }

    target.namespaces[validOptions.key] = validOptions.value;
    return { context: target };
  }
}
