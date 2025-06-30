import { Module } from '@nestjs/common';
import { ConfigProviderRegistry, ConfigurationService, SchemaRegistry } from './services';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { ServiceRegistry } from './services';
import { GenerateSchemaCommand } from './commands/generate-schema.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { DiscoveryModule } from '@nestjs/core';

@Module({
  imports: [DiscoveryModule],
  providers: [
    ServiceRegistry,
    ConfigProviderRegistry,
    ConfigurationService,
    JsonSchemaGeneratorService,
    GenerateSchemaCommand,
    DynamicSchemaGeneratorService,
    SchemaRegistry,
  ],
  exports: [ConfigurationService, ServiceRegistry, SchemaRegistry],
})
export class ConfigurationModule {}
