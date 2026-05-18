import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminRoleCreateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Role name must not exceed 100 characters' })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}
