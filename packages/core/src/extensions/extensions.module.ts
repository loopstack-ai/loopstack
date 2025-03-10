import { Module } from '@nestjs/common';
import { ForwardChildContextTool } from './tools/forward-child-context.tool';
import { SetContextTool } from './tools/set-context.tool';
import { SetCustomOptionTool } from './tools/set-custom-option.tool';
import { AddNamespaceTool } from './tools/add-namespace.tool';
import { LoadDocumentTool } from './tools/load-document.tool';
import { PromptAction } from './actions/prompt.action';
import { CreateDocumentAction } from './actions/create-document.action';
import { TransitionManagerService } from './services/transition-manager.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { ProcessorModule } from '../processor/processor.module';
import { InitialRunValidator } from './validators/initial-run.validator';
import { WorkflowOptionValidator } from './validators/workflow-option.validator';

@Module({
  imports: [
    PersistenceModule,
    ProcessorModule,
  ],
  providers: [
    TransitionManagerService,

    PromptAction,
    CreateDocumentAction,

    ForwardChildContextTool,
    SetContextTool,
    SetCustomOptionTool,
    AddNamespaceTool,
    LoadDocumentTool,

    InitialRunValidator,
    WorkflowOptionValidator,
  ],
})
export class ExtensionsModule {}
