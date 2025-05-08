import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectConfigDto {
  @Expose()
  @ApiProperty({
    description: 'The name of the project type',
    example: 'my-model',
  })
  name: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'The title of the project type',
    example: 'My Project',
  })
  title: string;

  @Expose()
  @ApiProperty({
    description: 'The workspace type for this project',
    example: 'my-workspace',
  })
  workspace: string;
}