import { Injectable } from '@nestjs/common';
import { ToolInterface } from '../../processor/interfaces/tool.interface';
import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';
import { Tool } from '../../processor/decorators/tool.decorator';
import { z } from 'zod';

@Injectable()
@Tool()
export class RefTool implements ToolInterface {

  argsSchema = z.object({
    name: z.string(),
  });

  async apply(
    options: any,
    target: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {

    // this is not used as Ref types will be handled directly

    return target;
  }
}
