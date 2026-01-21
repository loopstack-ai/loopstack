import { JSONSchemaConfigType, UiFormType } from '../types';

export interface PipelineConfigInterface {
  blockName: string;
  title?: string;
  description?: string;
  schema?: JSONSchemaConfigType;
  ui?: UiFormType;
}
