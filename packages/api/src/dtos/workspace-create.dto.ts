import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { WorkspaceEnvironmentDto } from './workspace-environment.dto';

export class WorkspaceCreateDto {
  @IsOptional()
  @IsString({ message: 'Workspace title must be a string' })
  @MaxLength(200, { message: 'Workspace title must not exceed 200 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable title for the workspace. If not provided, a default name will be generated',
    example: 'My Awesome Workspace',
  })
  title?: string;

  @IsString()
  @MaxLength(200, {
    message: 'Workspace config key must not exceed 200 characters',
  })
  @ApiProperty({
    description: 'The config key of the workspace',
    example: 'file.yaml:my-workflow-type',
  })
  blockName: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Whether the workspace should be marked as favourite',
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
