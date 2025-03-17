import { Injectable } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { LOOP_STATE_MACHINE_ACTION_DECORATOR, StateMachineActionInterface } from '../../processor';
import { ServiceWithSchemaInterface } from '../../processor/interfaces/service-with-schema.interface';

@Injectable()
export class ActionRegistry {
  private actions: Map<string, StateMachineActionInterface> = new Map<
    string,
    StateMachineActionInterface
  >([]);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  initialize() {
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

  getEntries(): Array<[string, ServiceWithSchemaInterface]> {
    return Array.from(this.actions.entries());
  }
}
