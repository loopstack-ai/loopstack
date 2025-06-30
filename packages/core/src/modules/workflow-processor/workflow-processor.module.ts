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
  RootProcessorService, WorkflowContextService,
  ServiceExecutionService,
} from './services';
import {
  AddNamespaceService,
  BatchCreateDocumentsService,
  CreateDocumentService,
  MockService,
  LoadDocumentService,
  SetContextService,
  SetTargetPlaceService,
  TransitionSelectorService,
  UpdateDocumentService,
} from './tool-services';

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
    CreateDocumentService,
    BatchCreateDocumentsService,
    MockService,
    SetContextService,
    AddNamespaceService,
    LoadDocumentService,
    TransitionSelectorService,
    NamespaceProcessorService,
    PipelineProcessorService,
    UpdateDocumentService,
    TemplateExpressionEvaluatorService,
    SetTargetPlaceService,
    WorkflowContextService,
    ServiceExecutionService,

    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,

    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
  ],
  exports: [
    RootProcessorService,
    ToolExecutionService,
    TemplateExpressionEvaluatorService,
  ],
})
export class WorkflowProcessorModule {}
