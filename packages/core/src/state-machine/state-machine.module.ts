import { Module } from '@nestjs/common';
import { StateMachineProcessorService } from './services/state-machine-processor.service';
import {StateMachineValidatorRegistry} from "../state-machine/validators/state-machine-validator.registry";
import {DiscoveryModule} from "@nestjs/core";
import {ConfigurationModule} from "../configuration/configuration.module";
import {PersistenceModule} from "../persistence/persistence.module";
import {StateMachineConfigService} from "./services/state-machine-config.service";
import {DefaultSkipRunValidator} from "./validators/can-skip-run.validator";

@Module({
  imports: [DiscoveryModule, ConfigurationModule, PersistenceModule],
  providers: [
    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
    DefaultSkipRunValidator,
  ],
  exports: [StateMachineProcessorService],
})
export class StateMachineModule {}
