import { Injectable, Logger } from '@nestjs/common';
import Ajv, { JSONSchemaType } from 'ajv';
import { DocumentEntity } from '@loopstack/shared';

@Injectable()
export class SchemaValidatorService {
  private readonly logger = new Logger(SchemaValidatorService.name);

  validate(data: any, schema: JSONSchemaType<any>) {
    const ajv = new Ajv({
      strict: false,
      keywords: ['ui'],
    });
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      this.logger.error(data);
      this.logger.error(validate.errors);
      throw new Error(`Validating data failed.`);
    }
  }

  validateDocument(data: Partial<DocumentEntity>): void {
    if (data.schema) {
      this.validate(data.content, data.schema);
    }
  }
}
