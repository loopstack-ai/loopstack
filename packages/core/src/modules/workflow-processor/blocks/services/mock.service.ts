import { Injectable, Logger } from '@nestjs/common';
import {
  HandlerCallResult,
  ExecutionContext,
  DocumentType,
} from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from '../../services';
import { Tool } from '../../abstract';

@Injectable()
export class MockService {
  private readonly logger = new Logger(MockService.name);

  constructor(
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  async createMock(
    block: Tool,
    ctx: ExecutionContext<{
      input?: any;
      output?: any;
      error?: string;
    }>,
  ): Promise<HandlerCallResult> {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }

    let parsedInput: DocumentType | undefined;
    if (ctx.args.input) {
      parsedInput = this.templateExpressionEvaluatorService.parse<DocumentType>(
        ctx.args.input,
        { this: block },
      );
      this.logger.debug(`Parsed input: ${JSON.stringify(parsedInput)}`);
    }

    let parsedOutput: DocumentType | null = null;
    if (ctx.args.output) {
      parsedOutput =
        this.templateExpressionEvaluatorService.parse<DocumentType>(
          ctx.args.output,
          { this: block },
        );
    }

    if (ctx.args.error) {
      const parsedError = this.templateExpressionEvaluatorService.parse<string>(
        ctx.args.error,
        { this: block },
      );
      throw new Error(parsedError);
    }

    return {
      success: true,
      data: parsedOutput,
    };
  }

  async debug(
    ctx: ExecutionContext<{
      value?: any;
    }>,
  ): Promise<HandlerCallResult> {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }

    this.logger.debug(`Debug value: ${JSON.stringify(ctx.args.value)}`);

    return {
      success: true,
      data: null,
    };
  }
}
