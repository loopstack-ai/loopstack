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
  BlockRegistryService,
  ConfigLoaderService,
  ProcessorFactory,
  FactoryProcessorService,
  SequenceProcessorService,
  BlockProcessor,
  WorkflowProcessorService,
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
    BlockProcessor,
    ProcessorFactory,
    FactoryProcessorService,
    SequenceProcessorService,
    WorkflowProcessorService,

    WorkflowStateService,
    NamespaceProcessorService,
    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,
    StateMachineValidatorRegistry,
    StateMachineValidatorService,
    StateMachineProcessorService,
    StateMachineToolCallProcessorService,
    CreatePipelineService,

    ConfigLoaderService,
    BlockRegistryService,
  ],
  exports: [
    PersistenceModule,
    RootProcessorService,
    CreatePipelineService,
    BlockRegistryService,
    BlockProcessor,
    WorkflowProcessorService,
  ],
})
export class WorkflowProcessorModule {}
