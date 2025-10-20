import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
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

@BlockConfig({
  config: {
    description: 'Validate document against its schema.',
  },
  properties: ValidateDocumentInputSchema,
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
  async execute(): Promise<HandlerCallResult> {
    const document = this.state.documentIds.find(
      (id) => id === this.args.documentId,
    );
    if (!document) {
      throw new Error(`Document with ID ${this.args.documentId} not found.`);
    }

    // todo!
    // const zodSchema = this.createZod(document.schema);
    // if (!zodSchema) {
    //   throw Error(`No schema defined.`);
    // }

    try {
      const result = 'not implemented' //zodSchema.parse(document.schema); //todo!

      return {
        success: true,
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
