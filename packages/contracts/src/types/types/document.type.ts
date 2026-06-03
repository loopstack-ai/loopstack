import { z } from 'zod';
import { DocumentConfigSchema, DocumentMessageSchema, DocumentSchema, MimeTypeSchema } from '../../schemas/index.js';

export type MimeType = z.infer<typeof MimeTypeSchema>;
export type DocumentConfigType = z.infer<typeof DocumentConfigSchema>;
export type DocumentType = z.infer<typeof DocumentSchema>;
export type DocumentMessageType = z.infer<typeof DocumentMessageSchema>;

/** Static document meta — defined on the @Document() decorator, served via config endpoint. */
export interface StaticDocumentMeta {
  hidden?: boolean;
  mimeType?: MimeType;
  level?: 'debug' | 'info' | 'warning' | 'error';
  enableAtPlaces?: string[];
  hideAtPlaces?: string[];
}

/** Dynamic document meta — set per-instance at save time, persisted on the document entity. */
export interface DynamicDocumentMeta {
  invalidate?: boolean;
  streaming?: boolean;
  streamReadyForFinal?: boolean;
  data?: any;
}
