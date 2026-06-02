import type { DynamicDocumentMeta } from '../types/document.type.js';

export interface DocumentItemInterface {
  id: string;
  name: string;
  alias: string;
  content: any;
  validationError: any;
  meta: DynamicDocumentMeta | null;
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
