import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminRoleUpdateDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Role name must not exceed 100 characters' })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}
