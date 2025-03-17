import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { ToolInterface } from '../../processor/interfaces/tool.interface';
import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';
import { z } from 'zod';
import { Tool } from '../../processor';

@Injectable()
@Tool()
export class ForwardChildContextTool implements ToolInterface {

  schema = z.object({
    omit: z.array(z.string()).optional(),
  }).optional();

  async apply(
    props: z.infer<typeof this.schema>,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {

    const validOptions = this.schema.parse(props);

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
