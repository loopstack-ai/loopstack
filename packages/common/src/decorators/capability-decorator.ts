import { Injectable } from '@nestjs/common';

export const FACTORY_MODULE = 'FACTORY_MODULE';

export function CapabilityFactory(moduleClass: string) {
  return (target: any) => {
    Injectable()(target);
    Reflect.defineMetadata(FACTORY_MODULE, moduleClass, target);
    return target;
  };
}
