import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

@Injectable()
export class ParseSortByPipe<T extends object> implements PipeTransform<string | undefined, T[]> {
  constructor(private readonly dtoClass: ClassConstructor<T>) {}

  transform(value: string | undefined, _metadata: ArgumentMetadata): T[] {
    if (!value) {
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException('Invalid sortBy format: not valid JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new BadRequestException('Invalid sortBy format: expected a JSON array');
    }

    return parsed.map((item: unknown, index: number) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new BadRequestException(`Invalid sortBy format: item at index ${index} must be an object`);
      }

      const instance = plainToInstance(this.dtoClass, item, {
        excludeExtraneousValues: false,
      });

      const errors = validateSync(instance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
        throw new BadRequestException(`Invalid sortBy at index ${index}: ${messages.join(', ')}`);
      }

      return instance;
    });
  }
}
