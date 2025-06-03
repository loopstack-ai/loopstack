import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool, ToolInterface, ToolResult } from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@Tool()
export class SetContextService implements ToolInterface {
  private readonly logger = new Logger(SetContextService.name);

  configSchema = z
    .object({
      key: z.string(),
      value: z.any(),
    })
    .strict();

  schema = z
    .object({
      key: z.string(),
      value: z.any(),
    })
    .strict();

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
  ): Promise<ToolResult> {
    const validOptions = this.schema.parse(props);

    if (!workflow) {
      return {};
    }

    if (!workflow.contextUpdate) {
      workflow.contextUpdate = {};
    }

    workflow.contextUpdate[validOptions.key] = validOptions.value;

    this.logger.debug(`Set context update key "${validOptions.key}".`);

    return {
      workflow,
    };
  }
}
