import { JSONSchemaConfigType } from '../types/json-schema-config.type';
import { UiFormType } from '../types/ui-form.type';

export interface DocumentItemInterface {
  id: string;
  name: string;
  blockName: string;
  content: any;
  schema: JSONSchemaConfigType;
  validationError: any;
  ui: UiFormType;
  meta: any;
  isInvalidated: boolean;
  isPendingRemoval: boolean;
  version: number;
  index: number;
  transition: string | null;
  place: string;
  labels: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  pipelineId: string;
  workflowId: string;
}
