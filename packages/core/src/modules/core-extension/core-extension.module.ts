import { Module } from '@nestjs/common';
import { InitialRunValidator } from './validators';
import { WorkflowOptionValidator } from './validators';
import { PersistenceModule } from '../persistence/persistence.module';
import { CommonModule } from '../index';
import { ConfigurationModule } from '../configuration';
import {
  AddNamespaceTool,
  CreateDocumentTool,
  DebugImportsTool,
  LoadDocumentTool,
  SetContextTool,
  SetCustomOptionTool,
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
    SetCustomOptionTool,
    AddNamespaceTool,
    LoadDocumentTool,

    InitialRunValidator,
    WorkflowOptionValidator,
  ],
  exports: [],
})
export class CoreExtensionModule {}
