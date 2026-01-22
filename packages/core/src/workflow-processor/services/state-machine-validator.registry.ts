import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import _ from 'lodash';
import { LOOP_STATE_MACHINE_VALIDATOR_DECORATOR, StateMachineValidatorInterface } from '@loopstack/common';

@Injectable()
export class StateMachineValidatorRegistry implements OnModuleInit {
  private validators: {
    priority: number;
    instance: StateMachineValidatorInterface;
  }[] = [];

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance = provider.instance as object | null | undefined;
      if (!instance || !instance.constructor) continue;

      const options = this.reflector.get<{ priority: number }>(
        LOOP_STATE_MACHINE_VALIDATOR_DECORATOR,
        instance.constructor as Type<unknown>,
      );
      if (options) {
        this.validators.push({
          priority: options.priority ?? 0,
          instance: instance as StateMachineValidatorInterface,
        });
      }
    }
  }

  getValidators(): StateMachineValidatorInterface[] {
    return _.orderBy(this.validators, 'priority', 'asc').map((item) => item.instance);
  }
}
