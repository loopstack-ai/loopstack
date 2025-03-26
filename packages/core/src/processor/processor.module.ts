import { Module } from '@nestjs/common';
import { AdapterService, ProjectProcessorService } from './services';
import { ConfigurationModule } from '../configuration';
import { WorkflowProcessorService } from './services/workflow-processor.service';
import { ContextService } from './services/context.service';
import { ToolExecutionService } from './services';
import { ValueParserService } from './services/value-parser.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { DiscoveryModule } from '@nestjs/core';
import { StateMachineValidatorRegistry } from './services/state-machine-validator.registry';
import { StateMachineProcessorService } from './services/state-machine-processor.service';
import { StateMachineConfigService } from './services/state-machine-config.service';
import { CommonModule } from '../common';

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
  exports: [
    ProjectProcessorService,
    AdapterService,
  ],
})
export class ProcessorModule {}
