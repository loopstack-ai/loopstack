import { Module } from '@nestjs/common';
import { StateMachineProcessorService } from './services/state-machine-processor.service';
import { StateMachineValidatorRegistry } from './registry/state-machine-validator.registry';
import { DiscoveryModule } from '@nestjs/core';
import { ConfigurationModule } from '../configuration/configuration.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { StateMachineConfigService } from './services/state-machine-config.service';
import { TransitionManagerService } from './services/transition-manager.service';
import { StateMachineActionRegistry } from './registry/state-machine-action-registry.service';
import { PromptAction } from './actions/prompt.action';
import { StateMachineActionService } from './services/state-machine-action.service';
import { InitialRunValidator } from './validators/initial-run.validator';
import { WorkflowOptionValidator } from './validators/workflow-option.validator';

@Module({
  imports: [DiscoveryModule, ConfigurationModule, PersistenceModule],
  providers: [
    StateMachineValidatorRegistry,
    StateMachineActionRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
    TransitionManagerService,
    StateMachineActionService,

    InitialRunValidator,
    WorkflowOptionValidator,

    PromptAction,
  ],
  exports: [StateMachineProcessorService],
})
export class StateMachineModule {}
