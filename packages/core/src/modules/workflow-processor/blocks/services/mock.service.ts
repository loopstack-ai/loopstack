import { Injectable, Logger } from '@nestjs/common';
import {
  HandlerCallResult,
} from '@loopstack/shared';

@Injectable()
export class MockService {
  private readonly logger = new Logger(MockService.name);

  async createMock(
    args: {
      input?: any;
      output?: any;
      error?: string;
    },
  ): Promise<HandlerCallResult> {
    // let parsedInput: DocumentType | undefined;
    //
    // const parsedArgs = this.templateExpressionEvaluatorService.evaluateTemplate(
    //   args,
    //   {},
    //   workflowProcessor,
    //   ['document'],
    //   DocumentSchema,
    // );
    //
    // const parsedInput = this.templateExpressionEvaluatorService.parse<DocumentType>(
    //   args.input,
    //   workflowProcessor,
    // );
    this.logger.debug(`Input: ${JSON.stringify(args.input)}`);

    // let parsedOutput: DocumentType | null = null;
    // if (args.output) {
    //   parsedOutput =
    //     this.templateExpressionEvaluatorService.parse<DocumentType>(
    //       args.output,
    //       workflowProcessor,
    //     );
    // }

    if (args.error) {
      // const parsedError = this.templateExpressionEvaluatorService.parse<string>(
      //   args.error,
      //   workflowProcessor,
      // );
      throw new Error(args.error);
    }

    return {
      success: true,
      data: args.output,
    };
  }

  async debug(
    args: {
      value?: any;
    },
  ): Promise<HandlerCallResult> {
    this.logger.debug(`Debug value: ${JSON.stringify(args.value)}`);

    return {
      success: true,
      data: null,
    };
  }
}
