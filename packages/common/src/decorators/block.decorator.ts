import { BlockOptions } from '../interfaces';
import { Injectable, Scope, SetMetadata } from '@nestjs/common';

export const BLOCK_METADATA_KEY = 'block:metadata';

export function BlockConfig(options: BlockOptions): ClassDecorator {
  return (target: any) => {
    const scope = options.scope ?? Scope.TRANSIENT;
    Injectable({ scope })(target);

    Reflect.defineMetadata(BLOCK_METADATA_KEY, options, target);
    return target;
  };
}

export const INPUT_METADATA_KEY = Symbol('input');
export const OUTPUT_METADATA_KEY = Symbol('output');

/**
 * Marks a property as an input parameter
 * Inputs can be read and written
 */
export function Input() {
  return function (target: any, propertyKey: string) {
    const constructor = target.constructor;
    const existingInputs = Reflect.getOwnMetadata(INPUT_METADATA_KEY, constructor) || [];
    const newInputs = [...existingInputs, propertyKey];
    Reflect.defineMetadata(INPUT_METADATA_KEY, newInputs, constructor);
  };
}

/**
 * Marks a property/getter as an output value
 * Outputs are typically read-only (often getters)
 */
export function Output() {
  return function (target: any, propertyKey: string) {
    const constructor = target.constructor;
    const existingOutputs = Reflect.getOwnMetadata(OUTPUT_METADATA_KEY, constructor) || [];
    const newOutputs = [...existingOutputs, propertyKey];
    Reflect.defineMetadata(OUTPUT_METADATA_KEY, newOutputs, constructor);
  };
}

export function getDecoratedProperties(metatype: any, metadataKey: symbol): string[] {
  const properties = new Set<string>();
  let current = metatype;
  while (current && current !== Object && current !== Function.prototype) {
    const metadata = Reflect.getOwnMetadata(metadataKey, current);
    if (metadata && Array.isArray(metadata)) {
      metadata.forEach(prop => properties.add(prop));
    }
    current = Object.getPrototypeOf(current);
  }

  return Array.from(properties);
}