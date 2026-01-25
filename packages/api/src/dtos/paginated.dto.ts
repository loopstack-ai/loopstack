import { ApiProperty } from '@nestjs/swagger';
import { ClassConstructor, plainToInstance } from 'class-transformer';

export class PaginatedDto<T> {
  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
  })
  data: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
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
