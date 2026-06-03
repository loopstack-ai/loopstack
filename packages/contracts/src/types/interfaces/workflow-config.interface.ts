import { JSONSchemaConfigType, UiFormType, WorkflowTransitionType } from '../types/index.js';

export interface WorkflowConfigInterface {
  workflowName: string;
  title?: string;
  description?: string;
  schema?: JSONSchemaConfigType;
  ui?: UiFormType;
  transitions?: WorkflowTransitionType[];
}
