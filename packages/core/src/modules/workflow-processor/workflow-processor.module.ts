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
  HandlerExecutionService,
} from './services';
import {
  AddNamespaceHandler,
  BatchCreateDocumentsHandler,
  CreateDocumentHandler,
  LoadDocumentHandler,
  MockHandler, ResetErrorHandler,
  SetContextHandler,
  SetTargetPlaceHandler,
  TransitionSelectorHandler,
  UpdateDocumentHandler, ValidateDocumentHandler,
  ValidateHandler,
} from './handlers';
import { CreatePipelineService } from './services';

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
    HandlerExecutionService,
    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,
    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
    CreatePipelineService,

    // Tool Handlers
    CreateDocumentHandler,
    BatchCreateDocumentsHandler,
    MockHandler,
    SetContextHandler,
    AddNamespaceHandler,
    LoadDocumentHandler,
    TransitionSelectorHandler,
    UpdateDocumentHandler,
    SetTargetPlaceHandler,
    ValidateHandler,
    ResetErrorHandler,
    ValidateDocumentHandler,
  ],
  exports: [
    RootProcessorService,
    ToolExecutionService,
    TemplateExpressionEvaluatorService,
    CreatePipelineService,
  ],
})
export class WorkflowProcessorModule {}
