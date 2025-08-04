import { IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkspaceCreateDto {
  /**
   * Human-readable title for the workspace
   * @example "My Awesome Workspace"
   */
  @IsString()
  @MaxLength(200, { message: 'Workspace title must not exceed 200 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable title for the workspace',
    example: 'My Awesome Workspace',
  })
  title: string;

  @IsString()
  @MaxLength(200, { message: 'Workspace config key must not exceed 200 characters' })
  @ApiProperty({
    description: 'The config key of the workspace',
    example: 'file.yaml:my-workflow-type',
  })
  configKey: string;
}
