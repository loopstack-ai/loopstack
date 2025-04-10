import { Command, CommandRunner } from 'nest-commander';
import { JsonSchemaGeneratorService } from '../services/json-schema-generator.service';
import { Logger } from '@nestjs/common';

@Command({ name: 'generate-schemas', description: 'Generate json schema' })
export class GenerateSchemasCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateSchemasCommand.name);
  constructor(
    private readonly jsonSchemaGeneratorService: JsonSchemaGeneratorService,
  ) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log('Generating json schema...');
    await this.jsonSchemaGeneratorService.generateSchemas();
  }
}
