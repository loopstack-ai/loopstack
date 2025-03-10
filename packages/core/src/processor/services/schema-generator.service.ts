import { Injectable } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import {zodToJsonSchema} from "zod-to-json-schema";
import { writeFileSync } from 'fs';
import { MainSchemaGenerator } from '../schemas/main-schema-generator';
import { StateMachineActionRegistry } from './state-machine-action-registry.service';

const SCHEMA_PATH = "./src/generated/main.schema.json";

@Injectable()
export class SchemaGeneratorService {

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly actionRegistry: StateMachineActionRegistry,
  ) {}

  async generateSchemas() {

    const outputDir = path.resolve(process.cwd(), 'src/generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const toolSchemas = this.toolRegistry.getToolSchemas();
    const actionSchemas = this.actionRegistry.getActionSchemas();

    // console.log(toolSchemas.map((item) => item.shape));

    // @ts-ignore
    const unionToolSchemas = z.discriminatedUnion("tool", toolSchemas);
    // @ts-ignore
    const unionActionSchemas = z.discriminatedUnion("service", actionSchemas);

    const generator = new MainSchemaGenerator({
      toolConfigSchema: unionToolSchemas,
      actionConfigSchema: unionActionSchemas,
    })

    const mainSchema = generator.getSchema();

    const jsonSchema = zodToJsonSchema(mainSchema, {
      name: 'MainSchema',
      target: 'jsonSchema7'
    });

    writeFileSync(SCHEMA_PATH, JSON.stringify(jsonSchema, null, 2));
  }
}