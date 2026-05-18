import { Expose, plainToInstance } from 'class-transformer';
import { User, UserTypeEnum } from '@loopstack/common';

export class AdminUserItemDto {
  @Expose()
  id: string;

  @Expose()
  type: UserTypeEnum;

  @Expose()
  isActive: boolean;

  @Expose()
  roleNames: string[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  static create(user: User): AdminUserItemDto {
    return plainToInstance(
      AdminUserItemDto,
      {
        ...user,
        roleNames: user.roles?.map((role) => role.name) ?? [],
      },
      { excludeExtraneousValues: true },
    );
  }
}
