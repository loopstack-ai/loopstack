import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { CreateDocumentService } from '../services/create-document.service';

const CreateMarkdownMessageInputSchema = z.object({
  markdown: z.string(),
  title: z.string().optional(),
});

const CreateMarkdownMessageConfigSchema = z.object({
  markdown: z.string(),
  title: z.string().optional(),
});

type CreateMarkdownMessageInput = z.infer<
  typeof CreateMarkdownMessageInputSchema
>;

@Block({
  config: {
    type: 'tool',
    description: 'Create a markdown message.',
  },
  inputSchema: CreateMarkdownMessageInputSchema,
  configSchema: CreateMarkdownMessageConfigSchema,
})
export class CreateMarkdownMessage extends Tool {
  protected readonly logger = new Logger(CreateMarkdownMessage.name);

  constructor(private readonly createDocumentService: CreateDocumentService) {
    super();
  }

  async execute(
    ctx: ExecutionContext<CreateMarkdownMessageInput>,
  ): Promise<HandlerCallResult> {
    const transformedInput = {
      document: 'MarkdownMessageDocument',
      update: {
        content: {
          title: ctx.args.title,
          markdown: ctx.args.markdown,
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
