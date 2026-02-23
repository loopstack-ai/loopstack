import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminRoleCreateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Role name must not exceed 100 characters' })
  @ApiProperty({
    description: 'Unique role name',
    example: 'EDITOR',
  })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable description of the role',
    example: 'Can edit pipelines and workspaces',
  })
  description?: string;
}
