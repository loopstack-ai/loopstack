import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Tool,
  EvalContextInfo,
  ToolInterface,
  ToolResult,
  WorkflowEntity,
} from '@loopstack/shared';
import { ToolExecutionService } from '../index';

@Injectable()
@Tool()
export class ToolCallService implements ToolInterface {
  private readonly logger = new Logger(ToolCallService.name);
  schema = z.object({
    tool: z.string(),
    options: z.any().optional(),
  });

  constructor(private toolExecutionService: ToolExecutionService) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    info: EvalContextInfo,
  ): Promise<ToolResult> {
    const validOptions = this.schema.parse(props);

    return this.toolExecutionService.applyTool(
      {
        tool: validOptions.tool,
      },
      workflow,
      context,
      {
        ...info,
        options: {
          ...info.options,
          ...validOptions.options,
        },
      },
    );
  }
}
