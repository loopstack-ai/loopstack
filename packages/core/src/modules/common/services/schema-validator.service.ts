import { Injectable, Logger } from '@nestjs/common';
import Ajv from 'ajv';
import { DocumentType } from '@loopstack/shared';

@Injectable()
export class SchemaValidatorService {
  private readonly logger = new Logger(SchemaValidatorService.name);

  validateDocument(data: DocumentType): void {
    if (data.schema) {
      const ajv = new Ajv({
        strict: false,
        keywords: ['ui'],
      });
      const validate = ajv.compile(data.schema);
      const valid = validate(data.content);
      if (!valid) {
        this.logger.error(data.content);
        this.logger.error(validate.errors);
        throw new Error(`Error validating document content.`);
      }
    }
  }
}
