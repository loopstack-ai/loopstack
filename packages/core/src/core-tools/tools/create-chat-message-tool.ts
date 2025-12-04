import { BlockConfig, DocumentEntity, HandlerCallResult } from '@loopstack/common';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { ProcessorFactory, Tool } from '../../workflow-processor';
import { MessageDocument } from '../documents';
import { DelegateService } from '../services';
import { CreateDocument } from './create-document-tool';

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
  imports: [
    CreateDocument
  ],
  config: {
    description: 'Create chat message(s).',
  },
  properties: CreateChatMessageInputSchema,
  configSchema: CreateChatMessageConfigSchema,
})
export class CreateChatMessage extends Tool<CreateChatMessageInput> {
  protected readonly logger = new Logger(CreateChatMessage.name);

  constructor(
    private readonly delegateService: DelegateService,
  ) {
    super();
  }

  async execute(args: CreateChatMessageInput, ctx: any, factory: ProcessorFactory): Promise<HandlerCallResult> {
    const items = !Array.isArray(args) ? [args] : args;

    const createdDocuments: DocumentEntity[] = [];
    for (const item of items) {
      const createDocumentArgs = {
        document: MessageDocument.name,
        update: {
          content: {
            role: item.role,
            content: item.content,
            tool_calls: item.tool_calls,
            tool_call_id: item.tool_call_id,
            annotations: item.annotations,
            refusal: item.refusal,
          },
        },
      };

      const result = await this.delegateService.delegate(
        CreateDocument.name,
        createDocumentArgs,
        ctx,
        factory,
        this.metadata.imports,
      );

      createdDocuments.push(result.data as DocumentEntity)
    }

    return {
      data: createdDocuments,
      effects: {
        addWorkflowDocuments: createdDocuments,
      },
    };
  }
}
