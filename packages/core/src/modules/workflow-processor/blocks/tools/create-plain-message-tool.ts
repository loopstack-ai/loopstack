import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { CreateDocumentService } from '../services/create-document.service';

const CreatePlainMessageInputSchema = z.object({
  content: z.string(),
  title: z.string().optional(),
});

const CreatePlainMessageConfigSchema = z.object({
  content: z.string(),
  title: z.string().optional(),
});

type CreatePlainMessageInput = z.infer<typeof CreatePlainMessageInputSchema>;

@Block({
  config: {
    description: 'Create a plain message.',
  },
  properties: CreatePlainMessageInputSchema,
  configSchema: CreatePlainMessageConfigSchema,
})
export class CreatePlainMessage extends Tool {
  protected readonly logger = new Logger(CreatePlainMessage.name);

  constructor(private readonly createDocumentService: CreateDocumentService) {
    super();
  }

  async execute(
    ctx: ExecutionContext<CreatePlainMessageInput>,
  ): Promise<HandlerCallResult> {
    const transformedInput = {
      document: 'PlainMessageDocument',
      update: {
        content: {
          title: ctx.args.title,
          content: ctx.args.content,
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
