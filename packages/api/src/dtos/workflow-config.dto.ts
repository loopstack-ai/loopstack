import { Expose } from 'class-transformer';
import type { WorkflowConfigInterface } from '@loopstack/contracts/api';
import type { JSONSchemaConfigType, UiFormType, WorkflowTransitionType } from '@loopstack/contracts/types';

export class WorkflowConfigDto implements WorkflowConfigInterface {
  @Expose()
  workflowName: string;

  @Expose()
  title?: string;

  @Expose()
  description?: string;

  @Expose()
  schema?: JSONSchemaConfigType;

  @Expose()
  ui?: UiFormType;

  @Expose()
  transitions?: WorkflowTransitionType[];
}
