import { Injectable } from '@nestjs/common';
import Ajv from 'ajv';
import { DocumentType } from '@loopstack/shared';

@Injectable()
export class ActionHelperService {
  validateDocument(data: DocumentType): void {
    if (data.schema) {
      const ajv = new Ajv({
        strict: false,
        keywords: ['ui'],
      });
      const validate = ajv.compile(data.schema);
      const valid = validate(data.contents);
      if (!valid) {
        console.log(validate.errors);
        throw new Error(`Error validating document contents.`);
      }
    }
  }
}
