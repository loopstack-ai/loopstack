import { Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { BLOCK_METADATA_KEY, MODULE_FACTORY_CLASS } from '@loopstack/common';
import type { BlockConfigType } from '@loopstack/contracts/types';
import { BlockInterface } from '../interfaces/block.interface';
import { ICapabilityFactory } from '../abstract';

@Injectable()
export class CapabilityBuilder implements OnModuleInit {
  private logger = new Logger(CapabilityBuilder.name);
  private serviceToFactory = new Map<Type<any>, ICapabilityFactory>();

  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    const modules = (this.moduleRef as any).container?.getModules();

    if (modules) {
      for (const [key, module] of modules) {
        const moduleClass = module.metatype;

        if (!moduleClass) continue;

        const factoryClass = this.reflector.get<Type<any>>(
          MODULE_FACTORY_CLASS,
          moduleClass,
        );

        if (factoryClass) {
          const factory = this.moduleRef.get(factoryClass, { strict: false });

          if (factory && this.isFactory(factory)) {
            const providers = module.providers;
            const services: Type<any>[] = [];

            for (const [providerKey, provider] of providers) {
              const providerMetatype = provider.metatype;

              if (providerMetatype && providerMetatype !== factoryClass) {
                const hasBlockDecorator = this.reflector.get(
                  BLOCK_METADATA_KEY,
                  providerMetatype,
                );

                if (hasBlockDecorator) {
                  services.push(providerMetatype);
                }
              }
            }

            this.logger.log(
              `✅ Factory ${factoryClass.name} auto-discovered ${services.length} services from ${moduleClass.name}`,
            );

            for (const ServiceClass of services) {
              this.serviceToFactory.set(ServiceClass, factory);
            }
          }
        }
      }
    }
  }

  private isFactory(instance: any): instance is ICapabilityFactory {
    return typeof instance.resolve === 'function';
  }

  private resolveServiceClass<T>(
    serviceClassOrName: Type<T> | string,
  ): Type<T> {
    if (typeof serviceClassOrName === 'string') {
      // Find service class by name
      for (const ServiceClass of this.serviceToFactory.keys()) {
        if (ServiceClass.name === serviceClassOrName) {
          return ServiceClass as Type<T>;
        }
      }
      throw new Error(`Service with name '${serviceClassOrName}' not found`);
    }
    return serviceClassOrName;
  }

  async getCapability<T extends BlockInterface>(
    serviceClassOrName: Type<T> | string,
    config: BlockConfigType,
  ): Promise<T> {
    const ServiceClass = this.resolveServiceClass<T>(serviceClassOrName);

    // if (this.resolvedServices.has(ServiceClass)) {
    //   return this.resolvedServices.get(ServiceClass) as T;
    // }

    const factory = this.serviceToFactory.get(ServiceClass);

    if (!factory) {
      throw new Error(
        `Service ${ServiceClass.name} not available in this context`,
      );
    }

    const service = await factory.resolve<T>(ServiceClass);

    // this.resolvedServices.set(ServiceClass, service);

    service.config = config;

    return service;
  }
}
