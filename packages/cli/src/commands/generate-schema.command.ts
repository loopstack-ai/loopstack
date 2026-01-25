import { Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';
import { JsonSchemaGeneratorService } from '../services/json-schema-generator.service';

@Command({
  name: 'schema:generate',
  description: 'Generate project schema.json',
})
export class GenerateSchemaCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateSchemaCommand.name);
  constructor(private readonly jsonSchemaGeneratorService: JsonSchemaGeneratorService) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log('Generating json schema...');
    await Promise.resolve(this.jsonSchemaGeneratorService.generateSchemas());
  }
}
