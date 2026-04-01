import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, DocumentEntity, InjectDocument, InjectTool, Input, Tool, ToolResult } from '@loopstack/common';
import { CreateDocument, MessageDocument } from '@loopstack/core';

const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const CreateChatMessageInputSchema = z.union([MessageSchema, z.array(MessageSchema)]);

type CreateChatMessageInput = z.infer<typeof CreateChatMessageInputSchema>;

@Tool({
  config: {
    description: 'Create chat message(s).',
  },
})
export class CreateChatMessage extends BaseTool {
  protected readonly logger = new Logger(CreateChatMessage.name);

  @Input({
    schema: CreateChatMessageInputSchema,
  })
  content: CreateChatMessageInput;

  @InjectTool() private createDocument: CreateDocument;
  @InjectDocument() private messageDocument: MessageDocument;

  async run(args: CreateChatMessageInput): Promise<ToolResult> {
    const items = !Array.isArray(args) ? [args] : args;

    const createdDocuments: DocumentEntity[] = [];
    for (const item of items) {
      const createDocumentArgs = {
        document: 'messageDocument',
        update: {
          content: {
            role: item.role,
            content: item.content,
          },
        },
        validate: 'strict' as const,
      };

      const result = await this.createDocument.run(createDocumentArgs);
      createdDocuments.push(result.data as DocumentEntity);
    }

    return {
      data: createdDocuments,
      effects: [
        {
          addWorkflowDocuments: createdDocuments,
        },
      ],
    };
  }
}
