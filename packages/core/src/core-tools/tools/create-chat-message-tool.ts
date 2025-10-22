import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../workflow-processor';
import { CreateDocumentService } from '../services/create-document.service';

const CreateChatMessageInputSchema = z.object({
  content: z.union([z.string(), z.null()]),
  role: z.string(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
  annotations: z.any().optional(),
  refusal: z.any().optional(),
  meta: z
    .object({
      level: z
        .union([
          z.literal('debug'),
          z.literal('info'),
          z.literal('warning'),
          z.literal('error'),
        ])
        .optional(),
      invalidate: z.boolean().optional(),
    })
    .optional(),
});

const CreateChatMessageConfigSchema = z.object({
  content: z.union([z.string(), z.null()]),
  role: z.string(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
  annotations: z.any().optional(),
  refusal: z.any().optional(),
  meta: z
    .object({
      level: z
        .union([
          z.literal('debug'),
          z.literal('info'),
          z.literal('warning'),
          z.literal('error'),
        ])
        .optional(),
      invalidate: z.boolean().optional(),
    })
    .optional(),
});

type CreateChatMessageInput = z.infer<typeof CreateChatMessageInputSchema>;

@BlockConfig({
  config: {
    description: 'Create a chat message.',
  },
  properties: CreateChatMessageInputSchema,
  configSchema: CreateChatMessageConfigSchema,
})
export class CreateChatMessage extends Tool {
  protected readonly logger = new Logger(CreateChatMessage.name);

  constructor(private readonly createDocumentService: CreateDocumentService) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    const transformedInput = {
      document: 'MessageDocument',
      update: {
        content: {
          role: this.args.role,
          content: this.args.content,
          tool_calls: this.args.tool_calls,
          tool_call_id: this.args.tool_call_id,
          annotations: this.args.annotations,
          refusal: this.args.refusal,
        },
        meta: this.args.meta,
      },
    };

    return this.createDocumentService.createDocument(transformedInput, this);
  }
}
