import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ParseJsonPipe<T extends object> implements PipeTransform {
  constructor(private readonly dtoClass: ClassConstructor<T>) {}

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<T | T[] | undefined> {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'string') {
      return value as T | T[];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException(`Invalid JSON for query parameter '${metadata.data}'`);
    }

    const instances = plainToInstance(this.dtoClass, parsed as object | object[]);
    const itemsToValidate: T[] = Array.isArray(instances) ? instances : [instances];
    const errors = (await Promise.all(itemsToValidate.map((instance) => validate(instance)))).flat();
    if (errors.length > 0) {
      const messages = errors.map((err) => Object.values(err.constraints ?? {}).join(', '));
      throw new BadRequestException(`Validation failed for '${metadata.data}': ${messages.join('; ')}`);
    }
    return instances;
  }
}
