import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkspaceConfigDto {
  @Expose()
  @ApiProperty({
    description: 'The name of the workspace type',
    example: 'my-workspace-type',
  })
  name: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'The title of the workspace type',
    example: 'My Workspace',
  })
  title: string;
}
