import {
  Block,
  ExecutionContext,
  HandlerCallResult,
} from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { Tool } from '../../abstract';
import {
  CreateDocumentConfigSchema, CreateDocumentInput,
  CreateDocumentInputSchema,
  CreateDocumentService,
} from '../services/create-document.service';

@Block({
  config: {
    type: 'tool',
    description: "Create a document.",
  },
  inputSchema: CreateDocumentInputSchema,
  configSchema: CreateDocumentConfigSchema,
})
export class CreateDocument extends Tool {
  protected readonly logger = new Logger(CreateDocument.name);

  constructor(
    private readonly createDocumentService: CreateDocumentService,
  ) {
    super();
  }

  async execute(ctx: ExecutionContext<CreateDocumentInput>): Promise<HandlerCallResult> {
    return this.createDocumentService.createDocument(ctx);
  }
}