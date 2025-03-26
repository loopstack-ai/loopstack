import { Module } from '@nestjs/common';
import { AdapterRegistry, LoopConfigService } from './services';
import { ConfigModule } from '@nestjs/config';
import loadSchemas from './configuration';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { ToolRegistry } from './services';
import { GenerateSchemasCommand } from './commands/generate-schemas.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { DiscoveryModule } from '@nestjs/core';
import { MigrationsService } from './services/migrations.service';

@Module({
  imports: [
    DiscoveryModule,
    ConfigModule.forRoot({
      load: [loadSchemas],
    }),
  ],
  providers: [
    LoopConfigService,
    MigrationsService,
    JsonSchemaGeneratorService,
    ToolRegistry,
    AdapterRegistry,
    GenerateSchemasCommand,
    DynamicSchemaGeneratorService,
  ],
  exports: [
    LoopConfigService,
    ToolRegistry,
    AdapterRegistry,
  ],
})
export class ConfigurationModule {}
