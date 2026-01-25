import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { GenerateSchemaCommand } from './commands/generate-schema.command';
import { RegistryAddCommand } from './commands/registry-add.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';

@Module({
  imports: [DiscoveryModule],
  providers: [GenerateSchemaCommand, RegistryAddCommand, JsonSchemaGeneratorService, DynamicSchemaGeneratorService],
})
export class CliModule {}
