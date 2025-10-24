import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../workflow-processor';
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

@BlockConfig({
  config: {
    description: 'Create a markdown message.',
  },
  properties: CreateMarkdownMessageInputSchema,
  configSchema: CreateMarkdownMessageConfigSchema,
})
export class CreateMarkdownMessage extends Tool {
  protected readonly logger = new Logger(CreateMarkdownMessage.name);

  constructor(private readonly createDocumentService: CreateDocumentService) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    const transformedInput = {
      document: 'MarkdownMessageDocument',
      update: {
        content: {
          title: this.args.title,
          markdown: this.args.markdown,
        },
      },
    };

    const document = this.createDocumentService.createDocument(transformedInput, this);

    return {
      data: document,
      effects: {
        addWorkflowDocuments: [document],
      },
    };
  }
}
