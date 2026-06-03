import type { DynamicDocumentMeta } from '../types/document.type.js';

export interface DocumentItemInterface {
  id: string;
  documentName: string;
  content: any;
  validationError: any;
  meta: DynamicDocumentMeta | null;
  isInvalidated: boolean;
  index: number;
  transition: string | null;
  place: string | null;
  labels: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  workflowId: string;
}
