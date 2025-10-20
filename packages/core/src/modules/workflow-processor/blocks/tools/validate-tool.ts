import {
  BlockConfig,
  HandlerCallResult,
  JSONSchemaType,
} from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { jsonSchemaToZod } from 'json-schema-to-zod';

const ValidateInputSchema = z.object({
  source: z.any(),
  schema: JSONSchemaType,
  message: z.string().optional(),
});

const ValidateConfigSchema = z.object({
  source: z.any(),
  schema: JSONSchemaType,
  message: z.string().optional(),
});

type ValidateInput = z.infer<typeof ValidateInputSchema>;

@BlockConfig({
  config: {
    description: 'Validate data against JSON schema.',
  },
  properties: ValidateInputSchema,
  configSchema: ValidateConfigSchema,
})
export class Validate extends Tool {
  protected readonly logger = new Logger(Validate.name);

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
    const zodSchema = this.createZod(this.args.schema);
    if (!zodSchema) {
      throw Error(`No schema defined.`);
    }

    try {
      const result = zodSchema.parse(this.args.source);

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
