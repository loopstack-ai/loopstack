import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { z } from 'zod';
import { Logger } from '@nestjs/common';
import { Tool } from '../../abstract';
import { BatchCreateDocumentsService } from '../services/batch-create-documents.service';

const BatchCreateMessagesInputSchema = z
  .object({
    items: z.array(
      z.object({
        role: z.string(),
        content: z.array(z.any()),
      }),
    ),
  })
  .strict();

type BatchCreateMessagesInput = z.infer<typeof BatchCreateMessagesInputSchema>;

const BatchCreateMessagesConfigSchema = z
  .object({
    items: z.array(
      z.object({
        role: z.string(),
        content: z.array(z.any()),
      }),
    ),
  })
  .strict();

@BlockConfig({
  config: {
    description: 'Batch create messages.',
  },
  properties: BatchCreateMessagesInputSchema,
  configSchema: BatchCreateMessagesConfigSchema,
  documentationFile: __dirname + '/batch-create-messages-tool.md',
})
export class BatchCreateMessages extends Tool {
  protected readonly logger = new Logger(BatchCreateMessages.name);

  constructor(
    protected batchCreateDocumentsService: BatchCreateDocumentsService,
  ) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    return this.batchCreateDocumentsService.batchCreateDocuments(
      {
        document: 'message',
        items: this.args.items,
      }, this);
  }
}
