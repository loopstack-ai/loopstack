import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { CreateDocumentService } from '../services/create-document.service';

const CreateErrorMessageInputSchema = z.object({
  message: z.string(),
});

const CreateErrorMessageConfigSchema = z.object({
  message: z.string(),
});

type CreateErrorMessageInput = z.infer<typeof CreateErrorMessageInputSchema>;

@Block({
  config: {
    type: 'tool',
    description: 'Create an error message.',
  },
  inputSchema: CreateErrorMessageInputSchema,
  configSchema: CreateErrorMessageConfigSchema,
})
export class CreateErrorMessage extends Tool {
  protected readonly logger = new Logger(CreateErrorMessage.name);

  constructor(private readonly createDocumentService: CreateDocumentService) {
    super();
  }

  async execute(
    ctx: ExecutionContext<CreateErrorMessageInput>,
  ): Promise<HandlerCallResult> {
    const transformedInput = {
      document: 'ErrorMessageDocument',
      update: {
        content: {
          message: ctx.args.message,
        },
      },
    };

    const transformedCtx = new ExecutionContext(
      ctx.context,
      transformedInput,
      ctx.workflow,
      ctx.transitionData,
      ctx.parentArgs,
    );

    return this.createDocumentService.createDocument(transformedCtx);
  }
}
