import { JSONSchemaType } from '@loopstack/contracts/schemas';
import { BlockConfig, HandlerCallResult } from '@loopstack/common';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../workflow-processor';
import Ajv, { ValidateFunction } from 'ajv';

const ValidateInputSchema = z.object({
  data: z.any(),
  schema: JSONSchemaType,
  message: z.string().optional(),
  options: z
    .object({
      allErrors: z.boolean(),
      strict: z.boolean(),
    })
    .optional(),
});

const ValidateConfigSchema = z.object({
  source: z.any(),
  schema: JSONSchemaType,
  message: z.string().optional(),
  options: z
    .object({
      allErrors: z.boolean(),
      strict: z.boolean(),
    })
    .optional(),
});

type ValidateInput = z.infer<typeof ValidateInputSchema>;

@BlockConfig({
  config: {
    description: 'Validate data against JSON schema.',
  },
  properties: ValidateInputSchema,
  configSchema: ValidateConfigSchema,
})
export class Validate extends Tool<ValidateInput> {
  protected readonly logger = new Logger(Validate.name);

  async execute(): Promise<HandlerCallResult> {
    const ajv = new Ajv({
      allErrors: this.args.options?.allErrors ?? true,
      strict: this.args.options?.strict ?? true,
    });

    if (!this.args.schema) {
      throw Error(`No schema defined.`);
    }

    const validate: ValidateFunction = ajv.compile(this.args.schema);
    const isValid = validate(this.args.data);

    if (!isValid) {
      if (this.args.message) {
        throw new Error(this.args.message);
      }
      throw new Error(`Validation failed.`);
    }

    return {
      data: {
        valid: isValid,
        error: null,
      },
    };
  }
}
