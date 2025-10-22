import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../workflow-processor';
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

@BlockConfig({
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

  async execute(): Promise<HandlerCallResult> {
    const transformedInput = {
      document: 'PlainMessageDocument',
      update: {
        content: {
          title: this.args.title,
          content: this.args.content,
        },
      },
    };

    return this.createDocumentService.createDocument(transformedInput, this);
  }
}
