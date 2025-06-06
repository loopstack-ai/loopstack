import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ExpressionString,
  NonExpressionString,
  Service,
  ServiceInterface,
  ServiceCallResult,
} from '@loopstack/shared';

const config = z
  .object({
    transitions: z.array(
      z.object({
        place: NonExpressionString,
        condition: ExpressionString.optional(),
      }),
    ),
  })
  .strict();

const schema = z
  .object({
    transitions: z.array(
      z.object({
        place: NonExpressionString,
        condition: z.union([z.boolean(), z.undefined()]),
      }),
    ),
  })
  .strict();

@Injectable()
@Service({
  config,
  schema,
})
export class TransitionSelectorService implements ServiceInterface {
  private readonly logger = new Logger(TransitionSelectorService.name);

  async apply(props: z.infer<typeof schema>): Promise<ServiceCallResult> {
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
