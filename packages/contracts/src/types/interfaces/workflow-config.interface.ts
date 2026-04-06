import { JSONSchemaConfigType, UiFormType } from '../types';

export interface WorkflowConfigInterface {
  alias: string;
  title?: string;
  description?: string;
  schema?: JSONSchemaConfigType;
  ui?: UiFormType;
  transitions?: any[];
}
