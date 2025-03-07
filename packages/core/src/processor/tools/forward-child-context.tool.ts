import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { ToolInterface } from '../interfaces/tool.interface';
import { ProcessStateInterface } from '../interfaces/process-state.interface';
import { Tool } from '../decorators/tool.decorator';

@Injectable()
@Tool()
export class ForwardChildContextTool implements ToolInterface {
  async apply(
    options: any,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    return {
      ...target,
      context: _.merge(
        {},
        target.context,
        _.omit(source.context, options.omit),
      ),
    };
  }
}
