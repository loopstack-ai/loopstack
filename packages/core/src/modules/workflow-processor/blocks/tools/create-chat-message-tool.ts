import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
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

@Block({
  config: {
    type: 'tool',
    description: 'Create a chat message.',
  },
  inputSchema: CreateChatMessageInputSchema,
  configSchema: CreateChatMessageConfigSchema,
})
export class CreateChatMessage extends Tool {
  protected readonly logger = new Logger(CreateChatMessage.name);

  constructor(private readonly createDocumentService: CreateDocumentService) {
    super();
  }

  async execute(
    ctx: ExecutionContext<CreateChatMessageInput>,
  ): Promise<HandlerCallResult> {
    const transformedInput = {
      document: 'MessageDocument',
      update: {
        content: {
          role: ctx.args.role,
          content: ctx.args.content,
          tool_calls: ctx.args.tool_calls,
          tool_call_id: ctx.args.tool_call_id,
          annotations: ctx.args.annotations,
          refusal: ctx.args.refusal,
        },
        meta: ctx.args.meta,
      },
    };

    const transformedCtx = new ExecutionContext(
      ctx.context,
      transformedInput,
      ctx.workflow,
      ctx.transitionData,
      ctx.parentArgs,
    );

    return this.createDocumentService.createDocument(transformedCtx);
  }
}
