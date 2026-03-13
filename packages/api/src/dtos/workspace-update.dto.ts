import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateIf, ValidateNested } from 'class-validator';
import type { WorkspaceUpdateInterface } from '@loopstack/contracts/api';
import { WorkspaceEnvironmentDto } from './workspace-environment.dto';

export class WorkspaceUpdateDto implements WorkspaceUpdateInterface {
  @ValidateIf((o: { title?: string }) => o.title !== undefined)
  @IsString()
  @MaxLength(200, { message: 'Workspace title must not exceed 200 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable title for the workspace',
    example: 'My Awesome Workspace',
  })
  title?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Whether the workspace is marked as favourite',
    example: true,
  })
  isFavourite?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceEnvironmentDto)
  @ApiPropertyOptional({
    description: 'Environment assignments for this workspace',
    type: WorkspaceEnvironmentDto,
    isArray: true,
  })
  environments?: WorkspaceEnvironmentDto[];
}
