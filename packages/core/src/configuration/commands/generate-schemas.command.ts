import { Command, CommandRunner } from 'nest-commander';
import { JsonSchemaGeneratorService } from '../services/json-schema-generator.service';

@Command({ name: 'generate-schemas', description: 'Generate json schema' })
export class GenerateSchemasCommand extends CommandRunner {
  constructor(private readonly jsonSchemaGeneratorService: JsonSchemaGeneratorService) {
    super();
  }

  async run(): Promise<void> {
    console.log('Generating json schema...');
    await this.jsonSchemaGeneratorService.generateSchemas();
  }
}
