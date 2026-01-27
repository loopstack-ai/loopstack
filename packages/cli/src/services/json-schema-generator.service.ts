import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { writeFileSync } from 'fs';
import * as path from 'path';
import { toJSONSchema } from 'zod';
// import { DynamicSchemaGeneratorService } from './dynamic-schema-generator.service';
import { BlockConfigSchema } from '@loopstack/contracts/schemas';

const SCHEMA_PATH = './schema.json';

@Injectable()
export class JsonSchemaGeneratorService {
  // constructor(
  //   private readonly dynamicSchemaGeneratorService: DynamicSchemaGeneratorService,
  // ) {}

  generateSchemas() {
    const outputDir = path.resolve(process.cwd(), 'src/generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // const mainSchema = this.dynamicSchemaGeneratorService.getSchema();

    const jsonSchema = toJSONSchema(BlockConfigSchema);

    writeFileSync(SCHEMA_PATH, JSON.stringify(jsonSchema, null, 2));
  }
}
