import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import type { WorkspaceCreateInterface } from '@loopstack/contracts/api';

export class WorkspaceCreateDto implements WorkspaceCreateInterface {
  @IsOptional()
  @IsString({ message: 'Workspace title must be a string' })
  @MaxLength(200, { message: 'Workspace title must not exceed 200 characters' })
  title?: string;

  @IsString()
  @MaxLength(200, {
    message: 'Workspace config key must not exceed 200 characters',
  })
  appName: string;

  @IsOptional()
  @IsBoolean()
  isFavourite?: boolean;
}
