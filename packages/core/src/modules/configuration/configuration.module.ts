import { Module } from '@nestjs/common';
import {
  ConfigProviderRegistry,
  ConfigurationService,
} from './services';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { ServiceRegistry } from './services';
import { GenerateSchemasCommand } from './commands/generate-schemas.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { DiscoveryModule } from '@nestjs/core';

@Module({
  imports: [DiscoveryModule],
  providers: [
    ServiceRegistry,
    ConfigProviderRegistry,
    ConfigurationService,
    JsonSchemaGeneratorService,
    GenerateSchemasCommand,
    DynamicSchemaGeneratorService,
  ],
  exports: [ConfigurationService, ServiceRegistry],
})
export class ConfigurationModule {}
