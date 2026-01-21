import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { JSONSchemaConfigType, UiFormType } from '@loopstack/contracts/types';

export class PipelineConfigDto {
  @Expose()
  @ApiProperty({
    description: 'The config Key of the pipeline',
    example: 'file.yaml:my-model',
  })
  blockName: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'The title of the pipeline type',
    example: 'My Pipeline',
  })
  title?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'The description of the pipeline type',
  })
  description?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'The json schema for form validation',
  })
  schema?: JSONSchemaConfigType;

  @Expose()
  @ApiPropertyOptional({
    description: 'The ui config for interface rendering',
  })
  ui?: UiFormType;

  @Expose()
  @ApiPropertyOptional({
    description: 'The state machine transitions',
  })
  transitions?: any[];
}
