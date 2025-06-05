import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Tool,
  WorkflowRunContext,
  ToolInterface,
  ToolResult,
  WorkflowEntity,
} from '@loopstack/shared';
import { ToolExecutionService } from '../index';

const config = z
  .object({
    tool: z.string(),
    options: z.any().optional(),
  })
  .strict();

const schema = z
  .object({
    tool: z.string(),
    options: z.any().optional(),
  })
  .strict();

@Injectable()
@Tool({
  name: 'toolCall',
  description: 'Call another tool',
  config,
  schema,
})
export class ToolCallService implements ToolInterface {
  private readonly logger = new Logger(ToolCallService.name);

  constructor(private toolExecutionService: ToolExecutionService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    workflowContext: WorkflowRunContext,
  ): Promise<ToolResult> {
    return this.toolExecutionService.applyTool(
      {
        tool: props.tool,
      },
      workflow,
      context,
      {
        ...workflowContext,
        options: {
          ...workflowContext.options,
          ...props.options,
        },
      },
    );
  }
}
