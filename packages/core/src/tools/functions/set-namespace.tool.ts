import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { ToolInterface } from '../interfaces/tool.interface';
import { ResultInterface } from '../../processor/interfaces/result.interface';
import { Tool } from '../../processor/decorators/tool.decorator';

@Injectable()
@Tool()
export class SetNamespaceTool implements ToolInterface {
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
