import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { ToolInterface } from '../interfaces/tool.interface';
import { ProcessStateInterface } from '../interfaces/process-state.interface';
import { Tool } from '../decorators/tool.decorator';
import { z } from 'zod';

@Injectable()
@Tool()
export class ForwardChildContextTool implements ToolInterface {

  argsSchema = z.object({
    omit: z.array(z.string()).optional(),
  }).optional();

  async apply(
    options: any,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {

    const validOptions = this.argsSchema.parse(options);

    return {
      ...target,
      context: validOptions?.omit ? _.merge(
        {},
        target.context,
        _.omit(source.context, validOptions.omit),
      ) : source.context,
    };
  }
}
