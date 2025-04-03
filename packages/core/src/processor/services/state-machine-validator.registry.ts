import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import _ from 'lodash';
import { LOOP_STATE_MACHINE_VALIDATOR_DECORATOR, StateMachineValidatorInterface } from '@loopstack/shared';

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
      const instance = provider.instance;
      if (!instance || !instance.constructor) continue;

      const options = this.reflector.get<{ priority: number }>(
        LOOP_STATE_MACHINE_VALIDATOR_DECORATOR,
        instance.constructor,
      );
      if (options) {
        this.validators.push({
          priority: options.priority ?? 0,
          instance,
        });
      }
    }
  }

  getValidators(): StateMachineValidatorInterface[] {
    return _.orderBy(this.validators, 'priority', 'asc').map(
      (item) => item.instance,
    );
  }
}
