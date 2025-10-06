import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { cloneDeep } from 'lodash';
import { BlockRegistryItem } from '../../configuration';
import { Block, BlockContext } from '../abstract/block.abstract';

export type DataImport<T> = Partial<T>;
export type DataExport<T> = Partial<T>;

@Injectable()
export class ServiceStateFactory {
  constructor(private moduleRef: ModuleRef) {}

  /**
   * Creates a new instance of a service and populates its public properties
   * from the provided dataImport object
   */
  async createWithState<T>(
    ServiceClass: new (...args: any[]) => T,
    dataImport?: DataImport<T>
  ): Promise<T> {
    // Create new instance with all dependencies resolved
    const instance = await this.moduleRef.create(ServiceClass);

    // seal instance prevents adding arbitrary properties
    Object.seal(instance);

    // If dataImport provided, populate public properties
    if (dataImport) {
      this.importState(instance, dataImport);
    }

    return instance;
  }

  /**
   * Extracts all public property values from an instance
   * Returns a dataExport object that can be used to recreate the same state
   */
  exportState<T extends object>(instance: T): DataExport<T> {
    const dataExport: DataExport<T> = {};

    const properties = Object.keys(instance);

    for (const prop of properties) {
      const descriptor = Object.getOwnPropertyDescriptor(instance, prop);

      // Only include enumerable properties (public, non-private)
      if (descriptor && descriptor.enumerable) {
        const value = (instance as any)[prop];

        // Skip functions - in case assigned to a property
        if (typeof value !== 'function') {
          dataExport[prop as keyof T] = cloneDeep(value);
        }
      }
    }

    return dataExport;
  }

  /**
   * Imports state into an existing instance
   */
  public importState<T>(instance: T, dataImport: DataImport<T>): void {
    for (const [key, value] of Object.entries(dataImport)) {
      if (value !== undefined) {
        (instance as any)[key] = cloneDeep(value);
      }
    }
  }

  /**
   * Creates a new instance of the same class as the provided instance
   */
  async createInstanceOf<T extends object>(
    referenceInstance: T,
    dataImport?: DataImport<T>
  ): Promise<T> {
    const ServiceClass = referenceInstance.constructor as new (...args: any[]) => T;
    return this.createWithState(ServiceClass, dataImport);
  }

  async createBlockInstance<T>(registryItem: BlockRegistryItem, context?: BlockContext): Promise<T> {
    const block = await this.createInstanceOf(registryItem.provider.instance);
    block.initBlock(
      registryItem.target.name,
      registryItem.metadata,
      registryItem.config,
      context,
    );

    return block as T;
  }
}