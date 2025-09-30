import {
  Block,
  DocumentType,
  ExecutionContext,
  HandlerCallResult,
} from '@loopstack/shared';
import { z } from 'zod';
import { Logger } from '@nestjs/common';
import { Executable, TemplateExpressionEvaluatorService } from '../../modules';

const CreateMockInputSchema = z
  .object({
    input: z.any().optional(),
    output: z.any().optional(),
    error: z.string().optional(),
  })
  .strict();

type CreateMockInput = z.infer<typeof CreateMockInputSchema>;

const CreateMockConfigSchema = z
  .object({
    input: z.any().optional(),
    output: z.any().optional(),
    error: z.string().optional(),
  })
  .strict();

@Block({
  config: {
    type: 'tool',
    description: "Create a mock response for debugging and testing.",
  },
  inputSchema: CreateMockInputSchema,
  configSchema: CreateMockConfigSchema,
  documentationFile: __dirname + '/create-mock-tool.md',
})
export class CreateMock extends Executable {
  protected readonly logger = new Logger(CreateMock.name);

  constructor(
    protected templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {
    super();
  }

  async execute(ctx: ExecutionContext<CreateMockInput>): Promise<HandlerCallResult> {

    if (ctx.args.input) {
      const input = this.templateExpressionEvaluatorService.parse<DocumentType>(
        ctx.args.input,
        {
          args: ctx.parentArgs,
          context: ctx.context,
          workflow: ctx.workflow,
          transition: ctx.transitionData,
        },
      );

      this.logger.debug(input);
    }

    const output = ctx.args.output
      ? this.templateExpressionEvaluatorService.parse<DocumentType>(
        ctx.args.output,
        {
          args: ctx.parentArgs,
          context: ctx.context,
          workflow: ctx.workflow,
          transition: ctx.transitionData,
        },
      )
      : null;

    if (ctx.args.error) {
      const error = this.templateExpressionEvaluatorService.parse<string>(
        ctx.args.error,
        {
          args: ctx.parentArgs,
          context: ctx.context,
          workflow: ctx.workflow,
          transition: ctx.transitionData,
        },
      );

      throw new Error(error);
    }

    return {
      success: true,
      data: output,
    };
  }
}