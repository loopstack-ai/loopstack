import { Logger } from '@nestjs/common';
import {
  Handler,
  HandlerInterface,
  HandlerCallResult,
  TemplateExpression,
  JSONSchemaType,
} from '@loopstack/shared';
import { z } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';

const config = z
  .object({
    source: z.union([TemplateExpression, z.any()]),
    schema: z.union([TemplateExpression, JSONSchemaType]),
    message: z.union([TemplateExpression, z.string()]).optional(),
  })
  .strict();

const schema = z
  .object({
    source: z.any(),
    schema: JSONSchemaType,
    message: z.string().optional(),
  })
  .strict();

@Handler({
  config,
  schema,
})
export class ValidateHandler implements HandlerInterface {
  private readonly logger = new Logger(ValidateHandler.name);

  private createZod(jsonSchema: any): z.ZodType {
    const zodSchemaString = jsonSchemaToZod(jsonSchema);
    return new Function('z', `return ${zodSchemaString}`)(z);
  }

  async apply(props: z.infer<typeof schema>): Promise<HandlerCallResult> {
    const zodSchema = this.createZod(props.schema);
    if (!zodSchema) {
      throw Error(`No schema defined.`);
    }

    // allow throw error
    try {
      const result = zodSchema.parse(props.source);

      return {
        success: true,
        data: {
          valid: true,
          result,
          error: null,
        },
      };
    } catch (error) {
      if (props.message) {
        throw new Error(props.message);
      }

      throw error;
    }
  }
}
