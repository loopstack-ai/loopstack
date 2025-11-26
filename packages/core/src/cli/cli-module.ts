import { Module } from '@nestjs/common';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { GenerateSchemaCommand } from './commands/generate-schema.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { DiscoveryModule } from '@nestjs/core';
import { RegistryAddCommand } from './commands/registry-add.command';

@Module({
  imports: [DiscoveryModule],
  providers: [
    GenerateSchemaCommand,
    RegistryAddCommand,

    JsonSchemaGeneratorService,
    DynamicSchemaGeneratorService,

  ],
})
export class CliModule {}
