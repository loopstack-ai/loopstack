import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { writeFileSync } from 'fs';
// import { DynamicSchemaGeneratorService } from './dynamic-schema-generator.service';
import { BlockConfigSchema } from '@loopstack/shared';

const SCHEMA_PATH = './src/generated/main.schema.json';

@Injectable()
export class JsonSchemaGeneratorService {
  // constructor(
  //   private readonly dynamicSchemaGeneratorService: DynamicSchemaGeneratorService,
  // ) {}

  async generateSchemas() {
    const outputDir = path.resolve(process.cwd(), 'src/generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // const mainSchema = this.dynamicSchemaGeneratorService.getSchema();

    const jsonSchema = zodToJsonSchema(BlockConfigSchema, {
      name: 'MainSchema',
      target: 'jsonSchema7',
    });

    writeFileSync(SCHEMA_PATH, JSON.stringify(jsonSchema, null, 2));
  }
}
