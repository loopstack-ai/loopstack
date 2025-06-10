import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Service, ServiceInterface, ServiceCallResult } from '@loopstack/shared';

const config = z
  .object({
    input: z.string().optional(),
    output: z.string().optional(),
    error: z.string().optional(),
  })
  .strict();

const schema = z
  .object({
    input: z.string().optional(),
    output: z.string().optional(),
    error: z.string().optional(),
  })
  .strict();

@Injectable()
@Service({
  config,
  schema,
})
export class MockService implements ServiceInterface {
  private readonly logger = new Logger(MockService.name);

  async apply(props: z.infer<typeof schema>): Promise<ServiceCallResult> {

    if (props.input) {
      this.logger.debug(`Received mock input ${props.input}`);
    }

    if (props.error) {
      throw new Error(props.error);
    }

    return {
      success: true,
      data: { content: props.output }
    }
  }
}
