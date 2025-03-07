import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ToolInterface } from '../interfaces/tool.interface';
import { ProcessStateInterface } from '../interfaces/process-state.interface';
import { Tool } from '../decorators/tool.decorator';

@Injectable()
@Tool()
export class SetContextTool implements ToolInterface {
  schema = z.object({
    key: z.string(),
    value: z.any(),
  });

  async apply(
    options: any,
    target: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    const validOptions = this.schema.parse(options);

    target.context[validOptions.key] = validOptions.value;
    return target;
  }
}
