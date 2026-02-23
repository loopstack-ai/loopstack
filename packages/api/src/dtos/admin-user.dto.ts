import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type, plainToInstance } from 'class-transformer';
import { User, UserTypeEnum } from '@loopstack/common';
import { AdminRoleDto } from './admin-role.dto';

export class AdminUserDto {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @Expose()
  @ApiProperty({
    enum: UserTypeEnum,
    description: 'Type of user account',
    example: UserTypeEnum.Cloud,
  })
  type: UserTypeEnum;

  @Expose()
  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
  })
  isActive: boolean;

  @Expose()
  @Type(() => AdminRoleDto)
  @ApiProperty({
    type: [AdminRoleDto],
    description: 'Roles assigned to this user',
  })
  roles: AdminRoleDto[];

  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Timestamp when the user was created',
    example: '2023-01-15T14:30:00Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Timestamp when the user was last updated',
    example: '2023-02-20T09:15:30Z',
  })
  updatedAt: Date;

  static create(user: User): AdminUserDto {
    return plainToInstance(AdminUserDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
