import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../workflow-processor';
import { CreateDocumentService } from '../services/create-document.service';
import { MessageDocument } from '../documents';
import { BatchCreateDocumentsService } from '../services/batch-create-documents.service';

const MessageSchema = z.object({
  content: z.any(),
  role: z.string(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
  annotations: z.any().optional(),
  refusal: z.any().optional(),
});

const CreateChatMessageInputSchema = z.union([
  MessageSchema,
  z.array(MessageSchema),
]);

const CreateChatMessageConfigSchema = z.union([
  MessageSchema,
  z.array(MessageSchema),
]);

type CreateChatMessageInput = z.infer<typeof CreateChatMessageInputSchema>;

@BlockConfig({
  config: {
    description: 'Create chat message(s).',
  },
  properties: CreateChatMessageInputSchema,
  configSchema: CreateChatMessageConfigSchema,
})
export class CreateChatMessage extends Tool<CreateChatMessageInput> {
  protected readonly logger = new Logger(CreateChatMessage.name);

  constructor(
    private readonly createDocumentService: CreateDocumentService,
    private readonly batchCreateDocumentsService: BatchCreateDocumentsService,

  ) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {

    if (Array.isArray(this.args)) {
      const documents = this.batchCreateDocumentsService.batchCreateDocuments({
        document: MessageDocument.name,
        items: this.args,
      }, this);

      return {
        data: documents.map((document) => document.content),
        effects: {
          addWorkflowDocuments: documents,
        },
      }
    }

    const document = this.createDocumentService.createDocument({
      document: MessageDocument.name,
      update: {
        content: {
          role: this.args.role,
          content: this.args.content,
          tool_calls: this.args.tool_calls,
          tool_call_id: this.args.tool_call_id,
          annotations: this.args.annotations,
          refusal: this.args.refusal,
        },
      }
    }, this);

    return {
      data: document.content,
      effects: {
        addWorkflowDocuments: [document],
      },
    }
  }
}
