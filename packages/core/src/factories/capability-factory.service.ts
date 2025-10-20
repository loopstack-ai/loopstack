import { Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

export interface ICapabilityFactory {
  resolve<T>(ServiceClass: Type<T>): Promise<T>;
}

export abstract class CapabilityFactory implements ICapabilityFactory {
  constructor(protected readonly moduleRef: ModuleRef) {}

  async resolve<T>(ServiceClass: Type<T>): Promise<T> {
    return await this.moduleRef.resolve<T>(ServiceClass);
  }
}