import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration';
import { PersistenceModule } from '../persistence';
import { DiscoveryModule } from '@nestjs/core';
import { CommonModule } from '../common';
import {
  InitialRunValidator,
  WorkflowDependenciesValidator,
  WorkflowOptionValidator,
} from './validators';
import {
  StateMachineConfigService,
  StateMachineProcessorService,
  StateMachineValidatorRegistry,
  ToolExecutionService,
  NamespaceProcessorService,
  PipelineProcessorService,
  WorkflowProcessorService,
  TemplateExpressionEvaluatorService,
  WorkflowStateService,
  RootProcessorService,
  WorkflowContextService,
} from './services';
import { CreatePipelineService } from './services';
import { CreateDocument, CreateMock, MessageDocument } from './blocks';
import { CreateDocumentService } from './blocks/services/create-document.service';

@Module({
  imports: [
    DiscoveryModule,
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
  ],
  providers: [
    RootProcessorService,
    WorkflowStateService,
    WorkflowProcessorService,
    ToolExecutionService,
    NamespaceProcessorService,
    PipelineProcessorService,
    TemplateExpressionEvaluatorService,
    WorkflowContextService,
    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,
    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
    CreatePipelineService,

    CreateDocumentService,
    CreateMock,
    CreateDocument,
    MessageDocument,
  ],
  exports: [
    RootProcessorService,
    ToolExecutionService,
    TemplateExpressionEvaluatorService,
    CreatePipelineService,
  ],
})
export class WorkflowProcessorModule {}
