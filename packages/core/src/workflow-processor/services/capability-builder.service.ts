import { Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import {
  BLOCK_METADATA_KEY,
  FACTORY_MODULE,
} from '@loopstack/common';
import { BlockConfigType } from '@loopstack/contracts/types';
import { BlockInterface } from '../interfaces/block.interface';
import { ICapabilityFactory } from '../abstract';

@Injectable()
export class CapabilityBuilder implements OnModuleInit {
  private readonly logger = new Logger(CapabilityBuilder.name);
  private readonly serviceToFactory = new Map<Type<any>, ICapabilityFactory>();
  private readonly serviceNameToClass = new Map<string, Type<any>>();
  private initialized = false;

  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly discoveryService: DiscoveryService,
  ) {}

  async onModuleInit(): Promise<void> {
    const factories = this.discoverModuleFactories();

    this.logger.log(
      `Found Module Factories: ${Array.from(factories.keys()).join(', ') || '(none)'}`,
    );

    const modules = this.getModules();
    if (!modules) {
      const errorMsg = 'Could not access module container - this may indicate an incompatible NestJS version';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.registerCapabilitiesFromModules(modules, factories);

    this.initialized = true;
    this.logger.log(
      `CapabilityBuilder initialized with ${this.serviceToFactory.size} capabilities`,
    );
  }

  /**
   * Iterates through modules and registers capabilities that have the Block decorator.
   */
  private registerCapabilitiesFromModules(
    modules: Map<string, any>,
    factories: Map<string, { instance: ICapabilityFactory; metatype: Function | Type<any> }>,
  ): void {
    for (const [, module] of modules) {
      const moduleClass = module.metatype;
      if (!moduleClass) continue;

      const factoryEntry = factories.get(moduleClass.name);
      if (!factoryEntry) continue;

      this.registerModuleCapabilities(module, factoryEntry);
    }
  }

  /**
   * Registers all capabilities from a single module that have the Block decorator.
   */
  private registerModuleCapabilities(
    module: any,
    factoryEntry: { instance: ICapabilityFactory; metatype: Function | Type<any> },
  ): void {
    const { instance: factory, metatype: factoryClass } = factoryEntry;
    let count = 0;

    for (const [, provider] of module.providers) {
      const providerMetatype = provider.metatype;

      if (!providerMetatype || providerMetatype === factoryClass) continue;

      const hasBlockDecorator = this.reflector.get(
        BLOCK_METADATA_KEY,
        providerMetatype,
      );

      if (hasBlockDecorator) {
        this.registerCapability(providerMetatype, factory);
        count++;
      }
    }

    this.logger.log(
      `Factory ${factoryClass.name} registered ${count} capabilities from ${module.metatype.name}`,
    );
  }

  /**
   * Registers a capability with both class-based and name-based lookups.
   */
  private registerCapability(
    serviceClass: Type<any>,
    factory: ICapabilityFactory,
  ): void {
    this.serviceToFactory.set(serviceClass, factory);
    this.serviceNameToClass.set(serviceClass.name, serviceClass);
  }

  /**
   * Accesses NestJS internal module container.
   * WARNING: This uses internal NestJS APIs that may change between versions.
   */
  private getModules(): Map<string, any> | null {
    return (this.moduleRef as any).container?.getModules() ?? null;
  }

  private discoverModuleFactories(): Map<
    string,
    { instance: ICapabilityFactory; metatype: Function | Type<any> }
  > {
    const providers = this.discoveryService.getProviders();
    const factoryToModule = new Map<
      string,
      { instance: ICapabilityFactory; metatype: Function | Type<any> }
    >();

    for (const provider of providers) {
      const { instance, metatype } = provider;

      if (!metatype || !instance) continue;
      if (!this.isFactory(instance)) continue;

      const moduleName = this.reflector.get<string>(FACTORY_MODULE, metatype);

      if (moduleName) {
        factoryToModule.set(moduleName, { instance, metatype });
      }
    }

    return factoryToModule;
  }

  private isFactory(instance: unknown): instance is ICapabilityFactory {
    return (
      instance !== null &&
      typeof instance === 'object' &&
      'resolve' in instance &&
      typeof (instance as any).resolve === 'function'
    );
  }

  /**
   * Resolves a service class from either a class reference or a string name.
   * Uses O(1) lookup for both cases.
   */
  private resolveServiceClass<T>(serviceClassOrName: Type<T> | string): Type<T> {
    if (typeof serviceClassOrName === 'string') {
      const serviceClass = this.serviceNameToClass.get(serviceClassOrName);
      if (!serviceClass) {
        throw new Error(
          `Service with name '${serviceClassOrName}' not found. ` +
          `Available capabilities: ${this.getRegisteredCapabilities().join(', ')}`,
        );
      }
      return serviceClass as Type<T>;
    }
    return serviceClassOrName;
  }

  /**
   * Ensures the builder is initialized before use.
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'CapabilityBuilder is not yet initialized. ' +
        'Ensure onModuleInit has completed before calling getCapability.',
      );
    }
  }

  /**
   * Resolves and configures a capability instance.
   *
   * NOTE: The factory is expected to return a new instance for each call.
   * If your factory returns singletons, the config mutation will affect all consumers.
   *
   * @param serviceClassOrName - The service class or its name as a string
   * @param config - Configuration to apply to the resolved service
   * @returns A configured instance of the requested capability
   */
  async getCapability<T extends BlockInterface>(
    serviceClassOrName: Type<T> | string,
    config: BlockConfigType,
  ): Promise<T> {
    this.ensureInitialized();

    const ServiceClass = this.resolveServiceClass<T>(serviceClassOrName);
    const factory = this.serviceToFactory.get(ServiceClass);

    if (!factory) {
      throw new Error(
        `Service ${ServiceClass.name} not available. ` +
        `Ensure its module has a factory decorated with @CapabilityFactory.`,
      );
    }

    const service = await factory.resolve<T>(ServiceClass);
    service.config = config;

    return service;
  }

  /**
   * Returns the names of all registered capabilities.
   */
  getRegisteredCapabilities(): string[] {
    return Array.from(this.serviceNameToClass.keys());
  }

  /**
   * Checks if a capability is registered.
   */
  isCapabilityRegistered(serviceClassOrName: Type<any> | string): boolean {
    if (typeof serviceClassOrName === 'string') {
      return this.serviceNameToClass.has(serviceClassOrName);
    }
    return this.serviceToFactory.has(serviceClassOrName);
  }

  /**
   * @deprecated Use isCapabilityRegistered instead
   */
  hasCapability(serviceClassOrName: Type<any> | string): boolean {
    return this.isCapabilityRegistered(serviceClassOrName);
  }
}