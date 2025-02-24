import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import {LOOP_STATE_MACHINE_VALIDATOR_DECORATOR} from "../decorators/run-validation.decorator";
import {StateMachineValidatorInterface} from "../../processor/interfaces/state-machine-validator.interface";

@Injectable()
export class StateMachineValidatorRegistry implements OnModuleInit {
  private validators: StateMachineValidatorInterface[] = [];

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance = provider.instance;
      if (!instance || !instance.constructor) continue;

      const functionOptions = this.reflector.get<boolean>(
        LOOP_STATE_MACHINE_VALIDATOR_DECORATOR,
        instance.constructor,
      );
      if (functionOptions) {
        this.validators.push(instance);
      }
    }
  }

  getValidators(): StateMachineValidatorInterface[] {
    return this.validators;
  }
}
