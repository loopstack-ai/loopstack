import { JSONSchemaConfigType } from '../types/json-schema-config.type.js';
import { UiFormType } from '../types/ui-form.type.js';

export interface DocumentItemInterface {
  id: string;
  name: string;
  alias: string;
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
  workflowId: string;
}
