import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

@Injectable()
export class ParseFilterPipe<T extends object> implements PipeTransform<string | undefined, T> {
  constructor(private readonly dtoClass: ClassConstructor<T>) {}

  transform(value: string | undefined, _metadata: ArgumentMetadata): T {
    if (!value) {
      return {} as T;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException('Invalid filter format: not valid JSON');
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new BadRequestException('Invalid filter format: expected a JSON object');
    }

    const instance = plainToInstance(this.dtoClass, parsed, {
      excludeExtraneousValues: false,
    });

    const errors = validateSync(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
      throw new BadRequestException(`Invalid filter: ${messages.join(', ')}`);
    }

    return instance;
  }
}
