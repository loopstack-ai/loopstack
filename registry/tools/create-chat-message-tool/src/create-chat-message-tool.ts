import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { Block, ToolBase, WorkflowExecution } from '@loopstack/core';
import {
  BlockConfig,
  DocumentEntity,
  Tool,
  ToolResult,
  WithArguments,
} from '@loopstack/common';
import { CreateDocument, MessageDocument } from '@loopstack/core-ui-module';

const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const CreateChatMessageInputSchema = z.union([
  MessageSchema,
  z.array(MessageSchema),
]);

type CreateChatMessageInput = z.infer<typeof CreateChatMessageInputSchema>;

@Injectable()
@BlockConfig({
  config: {
    description: 'Create chat message(s).',
  },
})
@WithArguments(CreateChatMessageInputSchema)
export class CreateChatMessage extends ToolBase<CreateChatMessageInput> {
  protected readonly logger = new Logger(CreateChatMessage.name);

  @Tool() private createDocument: CreateDocument;

  async execute(
    args: CreateChatMessageInput,
    ctx: WorkflowExecution,
    parent: Block,
  ): Promise<ToolResult> {
    const items = !Array.isArray(args) ? [args] : args;

    const createdDocuments: DocumentEntity[] = [];
    for (const item of items) {
      const createDocumentArgs = {
        document: MessageDocument.name,
        update: {
          content: {
            role: item.role,
            content: item.content,
          },
        },
      };

      const result = await this.createDocument.execute(
        createDocumentArgs,
        ctx,
        parent,
      );
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
