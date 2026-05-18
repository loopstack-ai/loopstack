import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateIf, ValidateNested } from 'class-validator';
import type { WorkspaceUpdateInterface } from '@loopstack/contracts/api';
import { WorkspaceEnvironmentDto } from './workspace-environment.dto.js';

export class WorkspaceUpdateDto implements WorkspaceUpdateInterface {
  @ValidateIf((o: { title?: string }) => o.title !== undefined)
  @IsString()
  @MaxLength(200, { message: 'Workspace title must not exceed 200 characters' })
  title?: string;

  @IsOptional()
  @IsBoolean()
  isFavourite?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceEnvironmentDto)
  environments?: WorkspaceEnvironmentDto[];
}
