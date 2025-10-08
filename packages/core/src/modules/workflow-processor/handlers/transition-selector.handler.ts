import { Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  TemplateExpression,
  Handler,
  HandlerInterface,
  HandlerCallResult,
} from '@loopstack/shared';

const config = z
  .object({
    transitions: z.array(
      z.object({
        place: z.string(),
        condition: TemplateExpression.optional(),
      }),
    ),
  })
  .strict();

const schema = z
  .object({
    transitions: z.array(
      z.object({
        place: z.string(),
        condition: z.union([z.boolean(), z.undefined()]),
      }),
    ),
  })
  .strict();

@Handler({
  config,
  schema,
})
export class TransitionSelectorHandler implements HandlerInterface {
  private readonly logger = new Logger(TransitionSelectorHandler.name);

  async apply(props: z.infer<typeof schema>): Promise<HandlerCallResult> {
    let place: string | undefined;
    for (const option of props.transitions) {
      if (undefined === option.condition || option.condition) {
        place = option.place;
        break;
      }
    }

    return {
      success: true,
      place,
    };
  }
}
