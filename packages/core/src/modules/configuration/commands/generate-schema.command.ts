import { Command, CommandRunner } from 'nest-commander';
import { JsonSchemaGeneratorService } from '../services/json-schema-generator.service';
import { Logger } from '@nestjs/common';

@Command({ name: 'generate-schema', description: 'Generate json schema' })
export class GenerateSchemaCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateSchemaCommand.name);
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
