import { Module } from '@nestjs/common';
import {
  AdapterRegistry,
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
    ConfigurationService,
    JsonSchemaGeneratorService,
    ToolRegistry,
    AdapterRegistry,
    GenerateSchemasCommand,
    DynamicSchemaGeneratorService,
    ConfigProviderRegistry,
  ],
  exports: [ConfigurationService, ToolRegistry, AdapterRegistry],
})
export class ConfigurationModule {}
