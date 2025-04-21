import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration';
import { PersistenceModule } from '../persistence';
import { DiscoveryModule } from '@nestjs/core';
import { CommonModule } from '../index';
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
  WorkflowProcessorService,
} from './services';
import {
  AddNamespaceService,
  CreateDocumentService,
  DebugImportsService,
  LoadDocumentService,
  SetContextService,
  ToolCallService,
  TransitionSelectorService,
} from './tools';

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
    ToolCallService,
    CreateDocumentService,
    DebugImportsService,
    SetContextService,
    AddNamespaceService,
    LoadDocumentService,
    TransitionSelectorService,

    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,

    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
  ],
  exports: [WorkflowProcessorService],
})
export class WorkflowProcessorModule {}
