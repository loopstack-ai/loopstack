import { Injectable } from '@nestjs/common';
import {
  ToolApplicationInfo,
  ToolInterface,
  ToolResult,
} from '../../processor/interfaces/tool.interface';
import { z } from 'zod';
import { Tool } from '../../processor';
import { WorkflowEntity } from '../../persistence/entities';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { WorkflowData } from '../../processor/interfaces/workflow-data.interface';

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
