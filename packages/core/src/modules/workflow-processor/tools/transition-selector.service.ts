import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  Tool,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';

@Injectable()
@Tool()
export class TransitionSelectorService implements ToolInterface {
  private readonly logger = new Logger(TransitionSelectorService.name);
  schema = z.object({
    transitions: z.array(
      z.object({
        place: z.string(),
        condition: z.any().optional(),
      }),
    ),
  });

  async apply(props: z.infer<typeof this.schema>): Promise<ToolResult> {
    const validOptions = this.schema.parse(props);

    let nextPlace: string | undefined;
    for (const option of validOptions.transitions) {
      if (undefined === option.condition || option.condition) {
        nextPlace = option.place;
        break;
      }
    }

    return {
      data: {
        nextPlace,
      },
    };
  }
}
