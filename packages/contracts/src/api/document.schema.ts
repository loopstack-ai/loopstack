import { z } from 'zod';
import type { DynamicDocumentMeta } from '../types/types/document.type.js';
import { SortBySchema } from './common.schema.js';
import type { SortByInterface } from './common.schema.js';

export const DocumentItemSchema = z.object({
  id: z.string(),
  documentName: z.string(),
  content: z.any(),
  validationError: z.any(),
  meta: z.custom<DynamicDocumentMeta>().nullable(),
  isInvalidated: z.boolean(),
  index: z.number(),
  transition: z.string().nullable(),
  place: z.string().nullable(),
  labels: z.array(z.string()),
  tags: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  workspaceId: z.string(),
  workflowId: z.string(),
});
export type DocumentItemInterface = z.infer<typeof DocumentItemSchema>;

export const DocumentSchema = DocumentItemSchema;
export type DocumentInterface = DocumentItemInterface;

export const DocumentFilterSchema = z.object({
  workflowId: z.uuid().optional(),
  isInvalidated: z.boolean().optional(),
  place: z.string().optional(),
  /**
   * Only documents written after this instant — new ones and re-saved ones alike. Lets a client hold a
   * window of a run and fetch just what changed since its newest row, instead of re-reading the list.
   */
  updatedAfter: z.iso.datetime().optional(),
  /** Only documents ordered before this `index` — the previous page when walking a run's history backwards. */
  beforeIndex: z.number().optional(),
});
export type DocumentFilterInterface = z.infer<typeof DocumentFilterSchema>;

export const DocumentSortBySchema = SortBySchema;
export type DocumentSortByInterface = SortByInterface;
