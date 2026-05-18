import { Expose, Type, plainToInstance } from 'class-transformer';
import { User, UserTypeEnum } from '@loopstack/common';
import { AdminRoleDto } from './admin-role.dto.js';

export class AdminUserDto {
  @Expose()
  id: string;

  @Expose()
  type: UserTypeEnum;

  @Expose()
  isActive: boolean;

  @Expose()
  @Type(() => AdminRoleDto)
  roles: AdminRoleDto[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  static create(user: User): AdminUserDto {
    return plainToInstance(AdminUserDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
