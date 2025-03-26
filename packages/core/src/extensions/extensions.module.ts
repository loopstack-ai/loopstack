import { Module } from '@nestjs/common';
import { SetContextTool } from './tools/set-context.tool';
import { SetCustomOptionTool } from './tools/set-custom-option.tool';
import { AddNamespaceTool } from './tools/add-namespace.tool';
import { LoadDocumentTool } from './tools/load-document.tool';
import { CreateDocumentTool } from './tools/create-document.tool';
import { ProcessorModule } from '../processor';
import { InitialRunValidator } from './validators/initial-run.validator';
import { WorkflowOptionValidator } from './validators/workflow-option.validator';
import { DebugImportsTool } from './tools/debug-imports.tool';
import { ConfigModule } from '@nestjs/config';
import llmConfig from './extensions-module.config';
import { PersistenceModule } from '../persistence/persistence.module';
import { CommonModule } from '../common';
import { ConfigurationModule } from '../configuration';

@Module({
  imports: [
    ConfigModule.forFeature(llmConfig),
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
    ProcessorModule,
  ],
  providers: [
    CreateDocumentTool,
    DebugImportsTool,

    SetContextTool,
    SetCustomOptionTool,
    AddNamespaceTool,
    LoadDocumentTool,

    InitialRunValidator,
    WorkflowOptionValidator,
  ],
  exports: [],
})
export class ExtensionsModule {}
