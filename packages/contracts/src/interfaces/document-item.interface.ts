import { JSONSchemaConfigType, UiFormType } from '../schemas';

export interface DocumentItemInterface {
  id: string;
  name: string;
  configKey: string;
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
