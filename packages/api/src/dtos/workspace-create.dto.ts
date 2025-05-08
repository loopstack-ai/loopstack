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
  @MaxLength(200, { message: 'Workspace type must not exceed 200 characters' })
  @ApiProperty({
    description: 'The type of the workspace',
    example: 'my-workflow-type',
  })
  type: string;
}
