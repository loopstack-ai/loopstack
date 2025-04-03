import { Module } from '@nestjs/common';
import { AdapterRegistry, ConfigurationService } from './services';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { ToolRegistry } from './services';
import { GenerateSchemasCommand } from './commands/generate-schemas.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { DiscoveryModule } from '@nestjs/core';
import { MigrationsService } from './services/migrations.service';

@Module({
  imports: [
    DiscoveryModule,
  ],
  providers: [
    ConfigurationService,
    MigrationsService,
    JsonSchemaGeneratorService,
    ToolRegistry,
    AdapterRegistry,
    GenerateSchemasCommand,
    DynamicSchemaGeneratorService,
  ],
  exports: [
    ConfigurationService,
    ToolRegistry,
    AdapterRegistry,
  ],
})
export class ConfigurationModule {}
