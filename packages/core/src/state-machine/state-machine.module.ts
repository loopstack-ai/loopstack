import { Module } from '@nestjs/common';
import { StateMachineProcessorService } from './services/state-machine-processor.service';
import {StateMachineValidatorRegistry} from "./registry/state-machine-validator.registry";
import {DiscoveryModule} from "@nestjs/core";
import {ConfigurationModule} from "../configuration/configuration.module";
import {PersistenceModule} from "../persistence/persistence.module";
import {StateMachineConfigService} from "./services/state-machine-config.service";
import {DefaultSkipRunValidator} from "./validators/can-skip-run.validator";
import {StateManagerService} from "./services/state-manager.service";
import {StateMachineActionRegistry} from "./registry/state-machine-action-registry.service";
import {PromptAction} from "./actions/prompt.action";
import {StateMachineActionService} from "./services/state-machine-action.service";

@Module({
  imports: [DiscoveryModule, ConfigurationModule, PersistenceModule],
  providers: [
    StateMachineValidatorRegistry,
    StateMachineActionRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
    DefaultSkipRunValidator,
    StateManagerService,
    StateMachineActionService,

    PromptAction,
  ],
  exports: [StateMachineProcessorService],
})
export class StateMachineModule {}
