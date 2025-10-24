import { Injectable, Logger } from '@nestjs/common';
import { HandlerCallResult } from '@loopstack/shared';

@Injectable()
export class MockService {
  private readonly logger = new Logger(MockService.name);

  async createMock(args: {
    input?: any;
    output?: any;
    error?: string;
  }): Promise<HandlerCallResult> {
    this.logger.debug(`Debug value: ${JSON.stringify(args.input)}`);

    if (args.error) {
      throw new Error(args.error);
    }

    return {
      data: args.output,
    };
  }
}
