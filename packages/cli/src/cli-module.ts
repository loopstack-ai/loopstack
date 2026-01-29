import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { GenerateSchemaCommand } from './commands/generate-schema.command';
import { RegistryAddCommand } from './commands/registry-add.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { FileSystemService } from './services/file-system.service';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { ModuleInstallerService } from './services/module-installer.service';
import { PackageService } from './services/package.service';
import { PromptService } from './services/prompt.service';
import { RegistryService } from './services/registry.service';
import { TypeScriptAstService } from './services/typescript-ast.service';
import { WorkflowInstallerService } from './services/workflow-installer.service';

@Module({
  imports: [DiscoveryModule],
  providers: [
    GenerateSchemaCommand,
    RegistryAddCommand,
    JsonSchemaGeneratorService,
    DynamicSchemaGeneratorService,
    FileSystemService,
    ModuleInstallerService,
    PackageService,
    PromptService,
    RegistryService,
    TypeScriptAstService,
    WorkflowInstallerService,
  ],
})
export class CliModule {}
