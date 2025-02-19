import { Injectable } from '@nestjs/common';
import Ajv from 'ajv/dist/2020';
import { ModelInterface } from '../interfaces/model.interface';
import { modelSchemas } from '../schema/intext';

@Injectable()
export class ModelSchemaValidatorService {
  getMainSchema() {
    return modelSchemas.mainSchema;
  }

  getOtherSchemas() {
    return modelSchemas.other;
  }

  validate(config: any): ModelInterface {
    const ajv = new Ajv();

    this.getOtherSchemas().forEach((schema) => ajv.addSchema(schema));

    const validate = ajv.compile(this.getMainSchema());
    if (!validate(config)) {
      console.error(validate.errors);
      throw 'Invalid schema';
    }

    return config as ModelInterface;
  }
}
