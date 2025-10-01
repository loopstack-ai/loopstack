import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
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

@Block({
  config: {
    type: 'tool',
    description: 'Batch create messages.',
  },
  inputSchema: BatchCreateMessagesInputSchema,
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(
    ctx: ExecutionContext<BatchCreateMessagesInput>,
  ): Promise<HandlerCallResult> {
    return this.batchCreateDocumentsService.batchCreateDocuments({
      ...ctx,
      args: {
        document: 'message',
        items: ctx.args.items,
      },
    });
  }
}
