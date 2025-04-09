import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  generateObjectFingerprint,
  Tool,
  ToolApplicationInfo,
  ToolInterface,
  ToolResult,
  WorkflowData,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@Tool()
export class SetCustomOptionTool implements ToolInterface {
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
    const options = this.schema.parse(props);

    let data = workflow?.currData;

    const currentCustomOptions = data?.options ?? {};
    currentCustomOptions[options.key] = options.value;

    if (!data) {
      data = {};
    }
    data.options = currentCustomOptions;
    workflow!.optionsHash = generateObjectFingerprint(data.options);

    return {
      data,
      workflow,
    };
  }
}
