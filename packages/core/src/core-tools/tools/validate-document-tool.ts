import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BlockRegistryService, Tool } from '../../workflow-processor';

const ValidateDocumentInputSchema = z.object({
  documentId: z.string(),
  message: z.string().optional(),
});

const ValidateDocumentConfigSchema = z.object({
  documentId: z.string(),
  message: z.string().optional(),
});

type ValidateDocumentInput = z.infer<typeof ValidateDocumentInputSchema>;

@BlockConfig({
  config: {
    description: 'Validate document against its schema.',
  },
  properties: ValidateDocumentInputSchema,
  configSchema: ValidateDocumentConfigSchema,
})
export class ValidateDocument extends Tool {
  protected readonly logger = new Logger(ValidateDocument.name);

  constructor(private readonly blockRegistryService: BlockRegistryService) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    const document = this.ctx.workflow.documents.find(
      (id) => id === this.args.documentId,
    );
    if (!document) {
      throw new Error(`Document with ID ${this.args.documentId} not found.`);
    }

    const blockRegistryItem = this.blockRegistryService.getBlock(document.configKey);
    if (!blockRegistryItem) {
      throw new Error(`Block with name "${document.configKey}" not found.`);
    }

    const schema = blockRegistryItem.metadata.properties;
    if (!schema) {
      throw Error(`No schema defined.`);
    }

    try {
      const result = schema.parse(document.schema);

      return {
        data: {
          valid: true,
          result,
          error: null,
        },
      };
    } catch (error) {
      if (this.args.message) {
        throw new Error(this.args.message);
      }

      throw error;
    }
  }
}
