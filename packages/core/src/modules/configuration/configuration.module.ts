import { Module } from '@nestjs/common';
import {
  ConfigProviderRegistry,
  ConfigurationService,
  SchemaRegistry,
} from './services';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { HandlerRegistry } from './services';
import { GenerateSchemaCommand } from './commands/generate-schema.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { DiscoveryModule } from '@nestjs/core';

@Module({
  imports: [DiscoveryModule],
  providers: [
    HandlerRegistry,
    ConfigProviderRegistry,
    ConfigurationService,
    JsonSchemaGeneratorService,
    GenerateSchemaCommand,
    DynamicSchemaGeneratorService,
    SchemaRegistry,
  ],
  exports: [ConfigurationService, HandlerRegistry, SchemaRegistry],
})
export class ConfigurationModule {}
