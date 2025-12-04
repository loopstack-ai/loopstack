import { IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkspaceCreateDto {
  /**
   * Human-readable title for the workspace
   * @example "My Awesome Workspace"
   */
  @IsOptional()
  @IsString({ message: 'Workspace title must be a string' })
  @MaxLength(200, { message: 'Workspace title must not exceed 200 characters' })
  @ApiPropertyOptional({
    description:
      'Human-readable title for the workspace. If not provided, a default name will be generated',
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
}
