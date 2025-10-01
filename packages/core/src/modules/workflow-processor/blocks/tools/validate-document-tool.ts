import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { jsonSchemaToZod } from 'json-schema-to-zod';

const ValidateDocumentInputSchema = z.object({
  documentId: z.string(),
  message: z.string().optional(),
});

const ValidateDocumentConfigSchema = z.object({
  documentId: z.string(),
  message: z.string().optional(),
});

type ValidateDocumentInput = z.infer<typeof ValidateDocumentInputSchema>;

@Block({
  config: {
    type: 'tool',
    description: 'Validate document against its schema.',
  },
  inputSchema: ValidateDocumentInputSchema,
  configSchema: ValidateDocumentConfigSchema,
})
export class ValidateDocument extends Tool {
  protected readonly logger = new Logger(ValidateDocument.name);

  constructor() {
    super();
  }

  private createZod(jsonSchema: any): z.ZodType {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const zodSchemaString = jsonSchemaToZod(jsonSchema);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function('z', `return ${zodSchemaString}`)(z);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(
    ctx: ExecutionContext<ValidateDocumentInput>,
  ): Promise<HandlerCallResult> {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }

    const document = ctx.workflow.documents.find(
      (item) => item.id === ctx.args.documentId,
    );
    if (!document) {
      throw new Error(`Document with ID ${ctx.args.documentId} not found.`);
    }

    const zodSchema = this.createZod(document.schema);
    if (!zodSchema) {
      throw Error(`No schema defined.`);
    }

    try {
      const result = zodSchema.parse(document.schema);

      return {
        success: true,
        data: {
          valid: true,
          result,
          error: null,
        },
      };
    } catch (error) {
      if (ctx.args.message) {
        throw new Error(ctx.args.message);
      }

      throw error;
    }
  }
}
