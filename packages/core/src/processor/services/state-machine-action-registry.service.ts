import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { StateMachineActionInterface } from '../interfaces/state-machine-action.interface';
import { LOOP_STATE_MACHINE_ACTION_DECORATOR } from '../decorators/state-machine-observer.decorator';

@Injectable()
export class StateMachineActionRegistry implements OnModuleInit {
  private actions: Map<string, StateMachineActionInterface> = new Map<
    string,
    StateMachineActionInterface
  >([]);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance = provider.instance;
      if (!instance || !instance.constructor) continue;

      const options = this.reflector.get<boolean>(
        LOOP_STATE_MACHINE_ACTION_DECORATOR,
        instance.constructor,
      );
      if (options) {
        this.actions.set(instance.constructor.name, instance);
      }
    }
  }

  getActionByName(name: string): StateMachineActionInterface | undefined {
    return this.actions.get(name);
  }
}
