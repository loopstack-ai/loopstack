import { Injectable } from '@nestjs/common';

export const FACTORY_MODULE = 'FACTORY_MODULE';

export function CapabilityFactory(moduleClass: string) {
  return <T extends new (...args: unknown[]) => object>(target: T): T => {
    Injectable()(target);
    Reflect.defineMetadata(FACTORY_MODULE, moduleClass, target);
    return target;
  };
}
