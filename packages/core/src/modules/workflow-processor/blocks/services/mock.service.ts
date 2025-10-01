import { Injectable, Logger } from '@nestjs/common';
import {
  HandlerCallResult,
  ExecutionContext,
  DocumentType,
} from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from '../../services';
import { MockHandler } from '../../handlers/mock.handler';

@Injectable()
export class MockService {
  private readonly logger = new Logger(MockService.name);

  constructor(
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly mockHandler: MockHandler,
  ) {}

  async createMock(
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
        {
          args: ctx.parentArgs,
          context: ctx.context,
          workflow: ctx.workflow,
          transition: ctx.transitionData,
        },
      );
      this.logger.debug(`Parsed input: ${JSON.stringify(parsedInput)}`);
    }

    let parsedOutput: DocumentType | null = null;
    if (ctx.args.output) {
      parsedOutput =
        this.templateExpressionEvaluatorService.parse<DocumentType>(
          ctx.args.output,
          {
            args: ctx.parentArgs,
            context: ctx.context,
            workflow: ctx.workflow,
            transition: ctx.transitionData,
          },
        );
    }

    if (ctx.args.error) {
      const parsedError = this.templateExpressionEvaluatorService.parse<string>(
        ctx.args.error,
        {
          args: ctx.parentArgs,
          context: ctx.context,
          workflow: ctx.workflow,
          transition: ctx.transitionData,
        },
      );
      throw new Error(parsedError);
    }

    return this.mockHandler.apply(
      {
        input: parsedInput,
        output: parsedOutput,
      },
      ctx.workflow,
      ctx.context,
      ctx.transitionData,
      ctx.parentArgs,
    );
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

    return this.mockHandler.apply(
      {
        input: ctx.args.value,
        output: ctx.args.value,
      },
      ctx.workflow,
      ctx.context,
      ctx.transitionData,
      ctx.parentArgs,
    );
  }
}
