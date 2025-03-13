import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { z, ZodType } from 'zod';
import { ActionConfigDefaultSchema } from '../schemas/action.schema';
import { LOOP_STATE_MACHINE_ACTION_DECORATOR, StateMachineActionInterface } from '../../processor';

@Injectable()
export class ActionRegistry implements OnModuleInit {
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

  getActionSchemas(): ZodType[] {
    const schemas: ZodType[] = [];
    for (const [name, action] of this.actions.entries()) {

      console.log(name)
      if (action.propsSchema) {
        const actionSchema = ActionConfigDefaultSchema.extend({
          service: z.literal(name),
          props: action.propsSchema,
        });

        schemas.push(actionSchema);
      }
    }

    return schemas;
  }
}
