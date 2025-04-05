import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration';
import { PersistenceModule } from '../persistence/persistence.module';
import { DiscoveryModule } from '@nestjs/core';
import { CommonModule } from '../index';
import {
  StateMachineConfigService,
  StateMachineProcessorService,
  StateMachineValidatorRegistry,
  ToolExecutionService,
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
    WorkflowProcessorService,
    ToolExecutionService,

    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
  ],
  exports: [],
})
export class WorkflowProcessorModule {}
