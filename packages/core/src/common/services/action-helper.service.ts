import { Injectable } from '@nestjs/common';
import { DocumentCreateInterface } from '../../persistence/interfaces/document-create.interface';
import Ajv from 'ajv';

@Injectable()
export class ActionHelperService {
  validateDocument(data: DocumentCreateInterface): void {
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

  createDocument(
    data: DocumentCreateInterface,
    info: any,
  ): DocumentCreateInterface {
    return {
      ...data,
      transition: info.transition,
    } as DocumentCreateInterface;
  }
}
