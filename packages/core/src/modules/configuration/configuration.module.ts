import { Module } from '@nestjs/common';
import {
  ConfigProviderRegistry,
  ConfigurationService,
} from './services';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { ToolRegistry } from './services';
import { GenerateSchemasCommand } from './commands/generate-schemas.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { DiscoveryModule } from '@nestjs/core';

@Module({
  imports: [DiscoveryModule],
  providers: [
    ToolRegistry,
    ConfigProviderRegistry,
    ConfigurationService,
    JsonSchemaGeneratorService,
    GenerateSchemasCommand,
    DynamicSchemaGeneratorService,
  ],
  exports: [ConfigurationService, ToolRegistry],
})
export class ConfigurationModule {}
