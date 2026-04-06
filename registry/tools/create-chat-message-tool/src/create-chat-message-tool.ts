import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, DocumentEntity, Tool, ToolResult } from '@loopstack/common';
import { MessageDocument } from '@loopstack/core';

const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const CreateChatMessageInputSchema = z.union([MessageSchema, z.array(MessageSchema)]);

type CreateChatMessageInput = z.infer<typeof CreateChatMessageInputSchema>;

@Tool({
  uiConfig: {
    description: 'Create chat message(s).',
  },
  schema: CreateChatMessageInputSchema,
})
export class CreateChatMessage extends BaseTool {
  protected readonly logger = new Logger(CreateChatMessage.name);

  async call(args: CreateChatMessageInput): Promise<ToolResult> {
    const items = !Array.isArray(args) ? [args] : args;

    const createdDocuments: DocumentEntity[] = [];
    for (const item of items) {
      const entity = await this.repository.save(
        MessageDocument,
        {
          role: item.role,
          content: item.content,
        },
        { validate: 'strict' },
      );
      createdDocuments.push(entity);
    }

    return {
      data: createdDocuments,
    };
  }
}
