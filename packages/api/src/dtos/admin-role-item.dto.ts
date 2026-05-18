import { Expose, plainToInstance } from 'class-transformer';
import { Role } from '@loopstack/common';

export class AdminRoleItemDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  userCount: number;

  static create(role: Role & { userCount?: number }): AdminRoleItemDto {
    return plainToInstance(
      AdminRoleItemDto,
      {
        ...role,
        userCount: role.userCount ?? role.users?.length ?? 0,
      },
      { excludeExtraneousValues: true },
    );
  }
}
