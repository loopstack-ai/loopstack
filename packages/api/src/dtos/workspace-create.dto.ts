import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import type { WorkspaceCreateInterface } from '@loopstack/contracts/api';
import { WorkspaceEnvironmentDto } from './workspace-environment.dto';

export class WorkspaceCreateDto implements WorkspaceCreateInterface {
  @IsOptional()
  @IsString({ message: 'Workspace title must be a string' })
  @MaxLength(200, { message: 'Workspace title must not exceed 200 characters' })
  title?: string;

  @IsString()
  @MaxLength(200, {
    message: 'Workspace config key must not exceed 200 characters',
  })
  className: string;

  @IsOptional()
  @IsBoolean()
  isFavourite?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceEnvironmentDto)
  environments?: WorkspaceEnvironmentDto[];
}
