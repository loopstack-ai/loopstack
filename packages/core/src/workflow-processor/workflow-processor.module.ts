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
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity, NamespaceEntity, PipelineEntity, WorkflowEntity, WorkspaceEntity } from '@loopstack/common';
import {
  DocumentService, DynamicRepositoryService,
  NamespacesService,
  PipelineService,
  WorkflowService,
  WorkspaceService,
} from './services';
import { WorkflowSubscriber } from './subscriber/workflow.subscriber';
import { DocumentSubscriber } from './subscriber/document.subscriber';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineEntity,
      WorkflowEntity,
      DocumentEntity,
      WorkspaceEntity,
      NamespaceEntity,
    ]),
    DiscoveryModule,
    CommonModule,
  ],
  providers: [
    WorkflowService,
    PipelineService,
    WorkspaceService,
    DocumentService,
    NamespacesService,
    WorkflowSubscriber,
    DocumentSubscriber,
    {
      provide: DynamicRepositoryService,
      useFactory: (dataSource) => {
        return new DynamicRepositoryService(dataSource, {
          blacklist: [],
        });
      },
      inject: [DataSource],
    },

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
    WorkflowService,
    PipelineService,
    WorkspaceService,
    DocumentService,
    NamespacesService,
    DynamicRepositoryService,

    RootProcessorService,
    TemplateExpressionEvaluatorService,
    CreatePipelineService,
    BlockRegistryService,
    BlockProcessor,
    BlockFactory,
  ],
})
export class WorkflowProcessorModule {}
