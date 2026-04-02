import { JSONSchemaConfigType, UiFormType } from '../types';

export interface WorkflowConfigInterface {
  blockName: string;
  title?: string;
  description?: string;
  schema?: JSONSchemaConfigType;
  ui?: UiFormType;
  transitions?: any[];
}
