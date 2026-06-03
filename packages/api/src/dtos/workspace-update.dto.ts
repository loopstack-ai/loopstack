import { IsBoolean, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import type { WorkspaceUpdateInterface } from '@loopstack/contracts/api';

export class WorkspaceUpdateDto implements WorkspaceUpdateInterface {
  @ValidateIf((o: { title?: string }) => o.title !== undefined)
  @IsString()
  @MaxLength(200, { message: 'Workspace title must not exceed 200 characters' })
  title?: string;

  @IsOptional()
  @IsBoolean()
  isFavourite?: boolean;
}
