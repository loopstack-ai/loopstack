import { Module } from '@nestjs/common';
import { ForwardChildContextTool } from './tools/forward-child-context.tool';
import { SetContextTool } from './tools/set-context.tool';
import { SetCustomOptionTool } from './tools/set-custom-option.tool';
import { AddNamespaceTool } from './tools/add-namespace.tool';
import { LoadDocumentTool } from './tools/load-document.tool';
import { CreateDocumentAction } from './actions/create-document.action';
import { ProcessorModule } from '../processor';
import { InitialRunValidator } from './validators/initial-run.validator';
import { WorkflowOptionValidator } from './validators/workflow-option.validator';
import { DebugImportsAction } from './actions/debug-imports.action';
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
    CreateDocumentAction,
    DebugImportsAction,

    ForwardChildContextTool,
    SetContextTool,
    SetCustomOptionTool,
    AddNamespaceTool,
    LoadDocumentTool,

    InitialRunValidator,
    WorkflowOptionValidator,
  ],
  exports: []
})
export class ExtensionsModule {}
