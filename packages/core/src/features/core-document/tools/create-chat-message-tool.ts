import {
  BlockConfig,
  DocumentEntity, Tool,
  ToolResult, WithArguments,
} from '@loopstack/common';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { CreateDocument } from './create-document-tool';
import { ToolBase } from '../../../workflow-processor';
import { MessageDocument } from '../documents';
import { WorkflowExecution } from '../../../workflow-processor/interfaces/workflow-execution.interface';
import { Block } from '../../../workflow-processor/abstract/block.abstract';

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
            tool_calls: item.tool_calls,
            tool_call_id: item.tool_call_id,
            annotations: item.annotations,
            refusal: item.refusal,
          },
        },
      };

      const result = await this.createDocument.execute(createDocumentArgs, ctx, parent);
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
