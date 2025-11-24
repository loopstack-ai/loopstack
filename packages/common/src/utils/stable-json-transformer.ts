import { ValueTransformer } from 'typeorm';
import stringify from 'fast-json-stable-stringify';

export class StableJsonTransformer implements ValueTransformer {
  from(value: any): any {
    return value
      ? typeof value === 'string'
        ? JSON.parse(value)
        : value
      : value;
  }

  to(value: any): any {
    return value !== undefined ? stringify(value) : value;
  }
}
