import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { CreateDocumentService } from '../services/create-document.service';

const CreateResponseInputSchema = z.object({
  document: z.string(),
});

const CreateResponseConfigSchema = z.object({
  document: z.string(),
});

type CreateResponseInput = z.infer<typeof CreateResponseInputSchema>;

@Block({
  config: {
    type: 'tool',
    description: 'Create a response document.',
  },
  inputSchema: CreateResponseInputSchema,
  configSchema: CreateResponseConfigSchema,
})
export class CreateResponse extends Tool {
  protected readonly logger = new Logger(CreateResponse.name);

  constructor(private readonly createDocumentService: CreateDocumentService) {
    super();
  }

  async execute(
    ctx: ExecutionContext<CreateResponseInput>,
  ): Promise<HandlerCallResult> {
    const transformedInput = {
      document: ctx.args.document,
      update: {
        content: ctx.transitionData,
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
