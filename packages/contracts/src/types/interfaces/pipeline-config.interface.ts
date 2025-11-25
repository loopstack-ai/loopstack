import { JSONSchemaConfigType, UiFormType } from '../types';

export interface PipelineConfigInterface {
  configKey: string;
  title?: string;
  description?: string;
  schema?: JSONSchemaConfigType;
  ui?: UiFormType;
}