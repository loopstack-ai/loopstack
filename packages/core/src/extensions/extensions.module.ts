import { Module } from '@nestjs/common';
import { ProcessorModule } from '../processor';
import { InitialRunValidator } from './validators/initial-run.validator';
import { WorkflowOptionValidator } from './validators/workflow-option.validator';
import { ConfigModule } from '@nestjs/config';
import llmConfig from './extensions-module.config';
import { PersistenceModule } from '../persistence/persistence.module';
import { CommonModule } from '../common';
import { ConfigurationModule } from '../configuration';
import {
  AddNamespaceTool,
  CreateDocumentTool,
  DebugImportsTool,
  LoadDocumentTool,
  SetContextTool,
  SetCustomOptionTool,
} from './tools';

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
