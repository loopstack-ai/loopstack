import { Command, CommandRunner } from 'nest-commander';
import { SchemaGeneratorService } from '../services';

@Command({ name: 'generate-schemas', description: 'Generate schema files' })
export class GenerateSchemasCommand extends CommandRunner {
  constructor(private readonly schemaGeneratorService: SchemaGeneratorService) {
    super();
  }

  async run(): Promise<void> {
    console.log('Generating schemas...');
    await this.schemaGeneratorService.generateSchemas();


  }
}
