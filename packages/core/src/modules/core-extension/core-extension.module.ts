import { Module } from '@nestjs/common';
import {
  InitialRunValidator,
  WorkflowOptionValidator,
  WorkflowDependenciesValidator,
} from './validators';
import { PersistenceModule } from '../persistence';
import { CommonModule } from '../index';
import { ConfigurationModule } from '../configuration';
import {
  AddNamespaceTool,
  CreateDocumentTool,
  DebugImportsTool,
  LoadDocumentTool,
  SetContextTool,
  CreateErrorTool,
  TransitionSelectorService,
} from './tools';
import { WorkflowProcessorModule } from '../workflow-processor';

@Module({
  imports: [
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
    WorkflowProcessorModule,
  ],
  providers: [
    CreateDocumentTool,
    DebugImportsTool,

    SetContextTool,
    AddNamespaceTool,
    LoadDocumentTool,
    CreateErrorTool,
    TransitionSelectorService,

    InitialRunValidator,
    WorkflowOptionValidator,
    WorkflowDependenciesValidator,
  ],
  exports: [],
})
export class CoreExtensionModule {}
