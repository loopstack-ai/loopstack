import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { ToolInterface } from '../../processor/interfaces/tool.interface';
import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';
import { z } from 'zod';
import { Tool } from '../../processor';

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

    const omit = validOptions?.omit ?? [
      'namespaceIds',
      'labels',
      'iteratorGroup',
      'iteratorValue',
      'customOptions',
      'imports',
    ]

    return {
      ...target,
      context: _.merge(
        {},
        target.context,
        _.omit(source.context, omit),
      ),
    };
  }
}
