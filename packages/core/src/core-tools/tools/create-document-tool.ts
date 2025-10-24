import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { Tool } from '../../workflow-processor';
import {
  CreateDocumentConfigSchema,
  CreateDocumentInputSchema,
  CreateDocumentService,
} from '../services/create-document.service';

@BlockConfig({
  config: {
    description: 'Create a document.',
  },
  properties: CreateDocumentInputSchema,
  configSchema: CreateDocumentConfigSchema,
})
export class CreateDocument extends Tool {
  protected readonly logger = new Logger(CreateDocument.name);

  constructor(private readonly createDocumentService: CreateDocumentService) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    const document = this.createDocumentService.createDocument(this.args, this);

    return {
      data: document,
      effects: {
        addWorkflowDocuments: [document],
      }
    }
  }
}
