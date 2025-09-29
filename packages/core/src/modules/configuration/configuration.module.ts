import { Module } from '@nestjs/common';
import {
  BlockRegistryService,
  ConfigLoaderService,
  ZodGeneratorService,
} from './services';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { GenerateSchemaCommand } from './commands/generate-schema.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { DiscoveryModule } from '@nestjs/core';

@Module({
  imports: [DiscoveryModule],
  providers: [
    JsonSchemaGeneratorService,
    GenerateSchemaCommand,
    DynamicSchemaGeneratorService,
    ZodGeneratorService,
    BlockRegistryService,
    ConfigLoaderService,
  ],
  exports: [ZodGeneratorService, BlockRegistryService],
})
export class ConfigurationModule {}
