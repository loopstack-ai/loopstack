import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Tool,
  ToolApplicationInfo,
  ToolInterface,
  ToolResult,
  WorkflowData,
} from '@loopstack/shared';
import { WorkflowEntity } from '../../persistence';

@Injectable()
@Tool()
export class SetContextTool implements ToolInterface {
  schema = z.object({
    key: z.string(),
    value: z.any(),
  });

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    data: WorkflowData | undefined,
    info: ToolApplicationInfo,
  ): Promise<ToolResult> {
    const validOptions = this.schema.parse(props);

    context[validOptions.key] = validOptions.value;
    return {
      context,
    };
  }
}
