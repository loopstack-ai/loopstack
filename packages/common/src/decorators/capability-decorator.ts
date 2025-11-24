import { Injectable, Type } from '@nestjs/common';

export const CAPABILITY_METADATA = 'is_capability';
export const MODULE_FACTORY_CLASS = 'module_factory_class';

export function Capability() {
  return (target: any) => {
    Injectable()(target);
    Reflect.defineMetadata(CAPABILITY_METADATA, true, target);
  };
}

export function ModuleFactory(factoryClass: Type<any>) {
  return (target: any) => {
    Reflect.defineMetadata(MODULE_FACTORY_CLASS, factoryClass, target);
  };
}
