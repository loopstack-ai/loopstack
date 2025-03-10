import { Injectable } from '@nestjs/common';
import { ToolInterface } from '../interfaces/tool.interface';
import { ProcessStateInterface } from '../interfaces/process-state.interface';
import { Tool } from '../decorators/tool.decorator';
import { z } from 'zod';

@Injectable()
@Tool()
export class SetContextTool implements ToolInterface {

  argsSchema = z.object({
    key: z.string(),
    value: z.any(),
  });

  async apply(
    options: any,
    target: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    const validOptions = this.argsSchema.parse(options);

    target.context[validOptions.key] = validOptions.value;
    return target;
  }
}
