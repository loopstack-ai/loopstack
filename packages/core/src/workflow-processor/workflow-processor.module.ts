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
  StateMachineValidatorService,
  StateMachineProcessorService,
  StateMachineToolCallProcessorService,
} from './services';
import { CreatePipelineService } from './services';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  NamespaceEntity,
  PipelineEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import { DataSource } from 'typeorm';
import { PersistenceModule } from '../persistence';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineEntity,
      WorkflowEntity,
      DocumentEntity,
      WorkspaceEntity,
      NamespaceEntity,
    ]),
    PersistenceModule,
    DiscoveryModule,
    CommonModule,
  ],
  providers: [
    // {
    //   provide: DynamicRepositoryService,
    //   useFactory: (dataSource) => {
    //     return new DynamicRepositoryService(dataSource, {
    //       blacklist: [],
    //     });
    //   },
    //   inject: [DataSource],
    // },

    RootProcessorService,
    BlockFactory, //*
    BlockProcessor, //*
    ProcessorFactory, //* injected as arg
    FactoryProcessorService, //*
    SequenceProcessorService, //*
    WorkflowProcessorService, //*
    WorkspaceProcessorService, //*
    ToolProcessorService, //*

    WorkflowStateService, //* workflow
    NamespaceProcessorService, //*
    InitialRunValidator, //* workflow
    WorkflowDependenciesValidator, //* workflow
    WorkflowOptionValidator, //* workflow
    StateMachineValidatorRegistry, //*
    StateMachineValidatorService, //*
    StateMachineProcessorService, //*
    StateMachineToolCallProcessorService, //*
    BlockHelperService, //*
    CreatePipelineService,

    ConfigLoaderService, //*BlockRegistryService
    BlockRegistryService, //* StateMachineToolCallProcessorService
    CapabilityBuilder, //*
  ],
  exports: [
    RootProcessorService,
    CreatePipelineService,
    BlockRegistryService,
    BlockProcessor,
    BlockFactory,
  ],
})
export class WorkflowProcessorModule {}
