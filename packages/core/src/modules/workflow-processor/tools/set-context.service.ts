import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Tool,
  ToolApplicationInfo,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@Tool()
export class SetContextService implements ToolInterface {
  private readonly logger = new Logger(SetContextService.name);
  schema = z.object({
    key: z.string(),
    value: z.any(),
  });

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    info: ToolApplicationInfo,
  ): Promise<ToolResult> {
    const validOptions = this.schema.parse(props);

    context[validOptions.key] = validOptions.value;

    this.logger.debug(`Set context key "${validOptions.key}".`);
    return {
      context,
    };
  }
}
