import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ToolInterface } from '../../processor/interfaces/tool.interface';
import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';
import { generateObjectFingerprint } from '@loopstack/shared';
import { Tool } from '../../processor';

@Injectable()
@Tool()
export class SetCustomOptionTool implements ToolInterface {
  schema = z.object({
    key: z.string(),
    value: z.any(),
  });

  async apply(
    data: any,
    target: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    const options = this.schema.parse(data);

    const currentCustomOptions = target.context.customOptions ?? {};
    currentCustomOptions[options.key] = options.value;

    target.context.customOptions = currentCustomOptions;
    target.workflow!.optionsHash = generateObjectFingerprint(
      target.context.customOptions,
    );

    return target;
  }
}
