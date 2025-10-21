import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
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

@BlockConfig({
  config: {
    description: 'Create a response document.',
  },
  properties: CreateResponseInputSchema,
  configSchema: CreateResponseConfigSchema,
})
export class CreateResponse extends Tool {
  protected readonly logger = new Logger(CreateResponse.name);

  constructor(private readonly createDocumentService: CreateDocumentService) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    const transformedInput = {
      document: this.args.document,
      update: {
        content: this.ctx.workflow.transition,
      },
    };

    return this.createDocumentService.createDocument(transformedInput, this);
  }
}
