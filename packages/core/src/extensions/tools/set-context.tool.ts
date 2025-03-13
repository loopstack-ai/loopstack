import { Injectable } from '@nestjs/common';
import { ToolInterface } from '../../processor/interfaces/tool.interface';
import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';
import { z } from 'zod';
import { Tool } from '../../processor';

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
