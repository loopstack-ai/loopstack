import { Logger } from '@nestjs/common';
import {
  Handler,
  HandlerInterface,
  HandlerCallResult,
  ExpressionString,
  JSONSchemaType,
} from '@loopstack/shared';
import { z } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';

const config = z
  .object({
    source: z.union([
      ExpressionString,
      z.any(),
    ]),
    schema: z.union([
      ExpressionString,
      JSONSchemaType,
    ]),
  })
  .strict();

const schema = z
  .object({
    source: z.any(),
    schema: JSONSchemaType,
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

  async apply(
    props: z.infer<typeof schema>,
  ): Promise<HandlerCallResult> {

    const zodSchema = this.createZod(props.schema);
    if (!zodSchema) {
      throw Error(`No schema defined.`);
    }

    // allow throw error
    const result = zodSchema.parse(props.source);

    return {
      success: true,
      data: {
        valid: true,
        result,
        error: null,
      },
    }
  }
}
