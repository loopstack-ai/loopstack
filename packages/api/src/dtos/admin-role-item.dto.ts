import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { Role } from '@loopstack/common';

export class AdminRoleItemDto {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the role',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Role name',
    example: 'ADMIN',
  })
  name: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Human-readable description',
    example: 'Administrator role with full access',
  })
  description: string;

  @Expose()
  @ApiProperty({
    type: 'number',
    description: 'Number of users assigned to this role',
    example: 3,
  })
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
