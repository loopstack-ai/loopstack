import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PipelineConfigDto {
  @Expose()
  @ApiProperty({
    description: 'The name of the pipeline type',
    example: 'my-model',
  })
  name: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'The title of the pipeline type',
    example: 'My Pipeline',
  })
  title: string;

  @Expose()
  @ApiProperty({
    description: 'The workspace type for this pipeline',
    example: 'my-workspace',
  })
  workspace: string;
}
