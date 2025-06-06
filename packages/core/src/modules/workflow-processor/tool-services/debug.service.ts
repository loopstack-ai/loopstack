import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Service, ServiceInterface, ServiceCallResult } from '@loopstack/shared';

const config = z
  .object({
    input: z.string().optional(),
    output: z.string().optional(),
  })
  .strict();

const schema = z
  .object({
    input: z.string().optional(),
    output: z.string().optional(),
  })
  .strict();

@Injectable()
@Service({
  config,
  schema,
})
export class DebugService implements ServiceInterface {
  private readonly logger = new Logger(DebugService.name);

  async apply(props: z.infer<typeof schema>): Promise<ServiceCallResult> {

    const message = props?.input ?? 'no message'

    this.logger.debug(message);

    return {
      success: true,
      data: { content: props?.output }
    }
  }
}
