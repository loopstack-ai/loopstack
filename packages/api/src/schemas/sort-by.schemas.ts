import { z } from 'zod';
import { DocumentEntity, WorkflowEntity } from '@loopstack/common';
import { SortBySchema } from '@loopstack/contracts/api';
import { getEntityColumns } from '../utils/get-entity-columns.util.js';

// The contracts schemas keep `field` an open string — only the server knows
// which entity columns are actually sortable.
const workflowColumns = getEntityColumns(WorkflowEntity);
const documentColumns = getEntityColumns(DocumentEntity);

export const WorkflowSortByQuerySchema = z.array(
  SortBySchema.refine((sort) => workflowColumns.includes(sort.field), {
    message: 'field must be a sortable workflow column',
  }),
);

export const DocumentSortByQuerySchema = z.array(
  SortBySchema.refine((sort) => documentColumns.includes(sort.field), {
    message: 'field must be a sortable document column',
  }),
);
