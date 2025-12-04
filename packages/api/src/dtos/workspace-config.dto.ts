import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkspaceConfigDto {
  /**
   * Config Key of the workspace
   */
  @Expose()
  @ApiProperty({
    description: 'Config key of the workspace',
    example: 'file.yaml:my-workspace',
  })
  blockName: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'The title of the workspace type',
    example: 'My Workspace',
  })
  title: string;
}
