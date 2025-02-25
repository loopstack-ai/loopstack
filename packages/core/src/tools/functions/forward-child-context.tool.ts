import { Injectable } from '@nestjs/common';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { _ } from 'lodash';
import { ToolInterface } from '../interfaces/tool.interface';
import { ResultInterface } from '../../processor/interfaces/result.interface';
import { Tool } from '../../processor/decorators/tool.decorator';

@Injectable()
@Tool()
export class ForwardChildContextTool implements ToolInterface {
  apply(
    options: any,
    target: ContextInterface,
    source: ResultInterface,
  ): ResultInterface {
    return {
      context: _.merge({}, target, _.omit(source.context, options.omit)),
    };
  }
}
