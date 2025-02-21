import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { FunctionInterface } from '../interfaces/function.interface';
import { LOOP_FUNCTION_DECORATOR } from '../../processor/decorators/loop-function.decorator';

@Injectable()
export class FunctionsRegistry implements OnModuleInit {
  private functions: Map<string, FunctionInterface> = new Map();

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
        LOOP_FUNCTION_DECORATOR,
        instance.constructor,
      );
      if (functionOptions) {
        this.registerFunction(instance);
      }
    }
  }

  private registerFunction(instance: FunctionInterface) {
    const name = instance.constructor.name;

    if (this.functions.has(name)) {
      throw new Error(`Duplicate function registration: "${name}"`);
    }

    this.functions.set(name, instance);
  }

  getFunctionByName(name: string): FunctionInterface | undefined {
    return this.functions.get(name);
  }
}
