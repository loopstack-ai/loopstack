import { Module } from '@nestjs/common';
import {
  ConfigProviderRegistry,
  ConfigurationService,
  SchemaRegistry, ZodGeneratorService,
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
    ZodGeneratorService,
  ],
  exports: [ConfigurationService, HandlerRegistry, SchemaRegistry, ZodGeneratorService],
})
export class ConfigurationModule {}
