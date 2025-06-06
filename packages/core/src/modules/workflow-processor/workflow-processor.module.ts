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
  ProjectProcessorService,
  WorkflowProcessorService,
  ToolSchemaValidatorService, TemplateExpressionEvaluatorService,
} from './services';
import {
  AddNamespaceService,
  BatchCreateDocumentsService,
  CreateDocumentService,
  DebugService,
  LoadDocumentService,
  SetContextService, SetTargetPlaceService,
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
    WorkflowProcessorService,
    ToolExecutionService,
    ToolSchemaValidatorService,
    CreateDocumentService,
    BatchCreateDocumentsService,
    DebugService,
    SetContextService,
    AddNamespaceService,
    LoadDocumentService,
    TransitionSelectorService,
    NamespaceProcessorService,
    ProjectProcessorService,
    UpdateDocumentService,
    TemplateExpressionEvaluatorService,
    SetTargetPlaceService,

    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,

    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
  ],
  exports: [ProjectProcessorService, WorkflowProcessorService, ToolExecutionService, TemplateExpressionEvaluatorService],
})
export class WorkflowProcessorModule {}
