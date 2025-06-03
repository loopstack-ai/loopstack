import { Injectable, Logger } from '@nestjs/common';
import { boolean, z } from 'zod';
import {
  ExpressionString,
  NonExpressionString,
  Tool,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';

@Injectable()
@Tool()
export class TransitionSelectorService implements ToolInterface {
  private readonly logger = new Logger(TransitionSelectorService.name);

  configSchema = z
    .object({
      transitions: z.array(
        z.object({
          place: NonExpressionString,
          condition: ExpressionString.optional(),
        }),
      ),
    })
    .strict();

  schema = z
    .object({
      transitions: z.array(
        z.object({
          place: NonExpressionString,
          condition: z.union([z.boolean(), z.undefined()]),
        }),
      ),
    })
    .strict();

  async apply(props: z.infer<typeof this.schema>): Promise<ToolResult> {
    const validOptions = this.schema.parse(props);

    let place: string | undefined;
    for (const option of validOptions.transitions) {
      if (undefined === option.condition || option.condition) {
        place = option.place;
        break;
      }
    }

    return {
      place,
    };
  }
}
