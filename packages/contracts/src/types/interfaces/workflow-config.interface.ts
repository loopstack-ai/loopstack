import { JSONSchemaConfigType, UiFormType, WorkflowTransitionType } from '../types/index.js';

export interface WorkflowConfigInterface {
  alias: string;
  title?: string;
  description?: string;
  schema?: JSONSchemaConfigType;
  ui?: UiFormType;
  transitions?: WorkflowTransitionType[];
}
