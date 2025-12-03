import { BlockConfig, HandlerCallResult } from '@loopstack/common';
import { z } from 'zod';
import { Logger } from '@nestjs/common';
import { BatchCreateDocumentsService } from '../services/batch-create-documents.service';
import { Tool } from '../../workflow-processor';

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
})
export class BatchCreateMessages extends Tool {
  protected readonly logger = new Logger(BatchCreateMessages.name);

  constructor(
    protected batchCreateDocumentsService: BatchCreateDocumentsService,
  ) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    throw new Error('Not implemented yet.');

    const documents = this.batchCreateDocumentsService.batchCreateDocuments(
      {
        document: 'message',
        items: this.args.items,
      },
      this,
    );

    return {
      data: documents,
      effects: {
        addWorkflowDocuments: documents,
      },
    };
  }
}
