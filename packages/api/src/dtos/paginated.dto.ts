import { ClassConstructor, plainToInstance } from 'class-transformer';
import type { PaginatedInterface } from '@loopstack/contracts/api';

export class PaginatedDto<T> implements PaginatedInterface<T> {
  data: T[];

  total: number;

  page: number;

  limit: number;

  static create<T>(classInstance: ClassConstructor<T>, data: PaginatedDto<any>) {
    const instance = new PaginatedDto<T>();

    instance.total = data.total;
    instance.page = data.page;
    instance.limit = data.limit;
    instance.data = plainToInstance(classInstance, data.data, {
      excludeExtraneousValues: true,
    });

    return instance;
  }
}
