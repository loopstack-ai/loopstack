import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool, ToolInterface, ToolResult } from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

const config = z
  .object({
    key: z.string(),
    value: z.any(),
  })
  .strict();

const schema = z
  .object({
    key: z.string(),
    value: z.any(),
  })
  .strict();

@Injectable()
@Tool({
  name: 'setContext',
  description: 'Set a context property value',
  config,
  schema,
})
export class SetContextService implements ToolInterface {
  private readonly logger = new Logger(SetContextService.name);

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
  ): Promise<ToolResult> {
    if (!workflow) {
      return {};
    }

    if (!workflow.contextUpdate) {
      workflow.contextUpdate = {};
    }

    workflow.contextUpdate[props.key] = props.value;

    this.logger.debug(`Set context update key "${props.key}".`);

    return {
      workflow,
    };
  }
}
