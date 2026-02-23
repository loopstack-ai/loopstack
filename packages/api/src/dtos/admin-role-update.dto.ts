import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminRoleUpdateDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Role name must not exceed 100 characters' })
  @ApiPropertyOptional({
    description: 'Unique role name',
    example: 'EDITOR',
  })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable description of the role',
    example: 'Can edit pipelines and workspaces',
  })
  description?: string;
}
