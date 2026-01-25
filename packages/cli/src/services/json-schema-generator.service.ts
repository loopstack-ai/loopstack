import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { writeFileSync } from 'fs';
import * as path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const jsonSchema = zodToJsonSchema(BlockConfigSchema as any, {
      name: 'MainSchema',
      target: 'jsonSchema7',
    });

    writeFileSync(SCHEMA_PATH, JSON.stringify(jsonSchema, null, 2));
  }
}
