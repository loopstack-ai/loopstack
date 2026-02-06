import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  DocumentEntity,
  InjectDocument,
  InjectTool,
  Tool,
  ToolInterface,
  ToolResult,
  WithArguments,
  WorkflowExecution,
} from '@loopstack/common';
import { CreateDocument, MessageDocument } from '@loopstack/core-ui-module';

const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const CreateChatMessageInputSchema = z.union([MessageSchema, z.array(MessageSchema)]);

type CreateChatMessageInput = z.infer<typeof CreateChatMessageInputSchema>;

@Injectable()
@Tool({
  config: {
    description: 'Create chat message(s).',
  },
})
@WithArguments(CreateChatMessageInputSchema)
export class CreateChatMessage implements ToolInterface<CreateChatMessageInput> {
  protected readonly logger = new Logger(CreateChatMessage.name);

  @InjectTool() private createDocument: CreateDocument;
  @InjectDocument() private messageDocument: MessageDocument;

  async execute(args: CreateChatMessageInput, ctx: WorkflowExecution): Promise<ToolResult> {
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

      const result = await this.createDocument.execute(createDocumentArgs, ctx, this);
      createdDocuments.push(result.data as DocumentEntity);
    }

    return {
      data: createdDocuments,
      effects: {
        addWorkflowDocuments: createdDocuments,
      },
    };
  }
}
