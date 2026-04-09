import { JSONSchemaConfigType, UiFormType, WorkflowTransitionType } from '../types';

export interface WorkflowConfigInterface {
  alias: string;
  title?: string;
  description?: string;
  schema?: JSONSchemaConfigType;
  ui?: UiFormType;
  transitions?: WorkflowTransitionType[];
}
