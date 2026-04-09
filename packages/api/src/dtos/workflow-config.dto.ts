import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import type { WorkflowConfigInterface } from '@loopstack/contracts/api';
import type { JSONSchemaConfigType, UiFormType, WorkflowTransitionType } from '@loopstack/contracts/types';

export class WorkflowConfigDto implements WorkflowConfigInterface {
  @Expose()
  @ApiProperty({
    description: 'The config Key of the workflow',
    example: 'file.yaml:my-model',
  })
  alias: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'The title of the workflow type',
    example: 'My Workflow',
  })
  title?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'The description of the workflow type',
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
  transitions?: WorkflowTransitionType[];
}
