import { Injectable } from '@nestjs/common';
import Ajv from 'ajv/dist/2020';
import { ModelInterface } from '../interfaces/model.interface';
import {ConfigService} from "@nestjs/config";
import {Schema} from "ajv";

@Injectable()
export class ModelSchemaValidatorService {

  constructor(private configService: ConfigService) {}

  getMainSchema() {
    return this.configService.get<Schema>('mainSchema');
  }

  getOtherSchemas() {
    return this.configService.get<Schema[]>('schemas');
  }

  validate(config: any): ModelInterface {
    const ajv = new Ajv();

    this.getOtherSchemas()?.forEach((schema) => ajv.addSchema(schema));

    const mainSchema = this.getMainSchema();
    if (!mainSchema) {
      throw 'Main schema not found';
    }

    const validate = ajv.compile(mainSchema);
    if (!validate(config)) {
      console.error(validate.errors);
      throw 'Invalid schema';
    }

    return config as ModelInterface;
  }
}
