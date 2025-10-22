import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { CommonModule } from '../common';
import {
  InitialRunValidator,
  WorkflowDependenciesValidator,
  WorkflowOptionValidator,
} from './validators';
import {
  StateMachineValidatorRegistry,
  NamespaceProcessorService,
  TemplateExpressionEvaluatorService,
  WorkflowStateService,
  RootProcessorService,
  BlockHelperService,
  CapabilityBuilder,
  BlockRegistryService,
  ConfigLoaderService,
  BlockFactory,
  ProcessorFactory,
  FactoryProcessorService,
  SequenceProcessorService,
  BlockProcessor,
  WorkflowProcessorService,
  WorkspaceProcessorService,
  ToolProcessorService,
} from './services';
import { CreatePipelineService } from './services';
import { PersistenceModule } from '../persistence';

@Module({
  imports: [DiscoveryModule, CommonModule, PersistenceModule],
  providers: [
    RootProcessorService,
    BlockFactory,
    BlockProcessor,
    ProcessorFactory,
    FactoryProcessorService,
    SequenceProcessorService,
    WorkflowProcessorService,
    WorkspaceProcessorService,
    ToolProcessorService,

    WorkflowStateService,
    NamespaceProcessorService,
    TemplateExpressionEvaluatorService,
    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,
    StateMachineValidatorRegistry,
    BlockHelperService,
    CreatePipelineService,

    ConfigLoaderService,
    BlockRegistryService,
    CapabilityBuilder,

  ],
  exports: [
    RootProcessorService,
    TemplateExpressionEvaluatorService,
    CreatePipelineService,
    BlockRegistryService,
  ],
})
export class WorkflowProcessorModule {}
