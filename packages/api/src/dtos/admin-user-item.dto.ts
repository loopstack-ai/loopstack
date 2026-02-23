import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { User, UserTypeEnum } from '@loopstack/common';

export class AdminUserItemDto {
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
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    description: 'Role names assigned to this user',
    example: ['ADMIN'],
  })
  roleNames: string[];

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
