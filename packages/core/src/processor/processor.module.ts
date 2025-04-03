import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration';
import { PersistenceModule } from '../persistence/persistence.module';
import { DiscoveryModule } from '@nestjs/core';
import { CommonModule } from '../common';
import {
  AdapterService,
  ContextService,
  ProjectProcessorService, StateMachineConfigService, StateMachineProcessorService,
  StateMachineValidatorRegistry,
  ToolExecutionService,
  ValueParserService,
  WorkflowProcessorService,
} from './services';

@Module({
  imports: [
    DiscoveryModule,
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
  ],
  providers: [
    ProjectProcessorService,
    WorkflowProcessorService,
    ContextService,
    ToolExecutionService,
    ValueParserService,

    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
    AdapterService,
  ],
  exports: [ProjectProcessorService, AdapterService],
})
export class ProcessorModule {}
