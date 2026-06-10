import { z } from 'zod';
import { DocumentConfigSchema, DocumentMessageSchema, DocumentSchema, MimeTypeSchema } from '../../schemas/index.js';

export type MimeType = z.infer<typeof MimeTypeSchema>;
export type DocumentConfigType = z.infer<typeof DocumentConfigSchema>;
export type DocumentType = z.infer<typeof DocumentSchema>;
export type DocumentMessageType = z.infer<typeof DocumentMessageSchema>;

/** Static document meta — defined on the @Document() decorator, served via config endpoint. */
export interface StaticDocumentMeta {
  /** Hide every instance of this document type from the Studio UI by default. */
  hidden?: boolean;
  /** MIME type hint used by Studio when rendering or downloading the document. */
  mimeType?: MimeType;
  /** Log-level-style severity. Studio may style documents based on this. */
  level?: 'debug' | 'info' | 'warning' | 'error';
  /** Only render this document type when the workflow is at one of these places. */
  enableAtPlaces?: string[];
  /** Hide this document type when the workflow is at one of these places. */
  hideAtPlaces?: string[];
}

/** Dynamic document meta — set per-instance at save time, persisted on the document entity. */
export interface DynamicDocumentMeta {
  /**
   * Opt-out of replacement. When `false`, saving a new document with the same `id` does NOT
   * invalidate this one — both rows survive. Default behavior (omitted/true) is to invalidate
   * the previous version when the same ID is reused.
   */
  invalidate?: boolean;
  /**
   * Frontend-only flag set by Studio during LLM streaming to indicate the document is still
   * being filled in. Not typically set by backend code.
   */
  streaming?: boolean;
  /**
   * Frontend-only companion to `streaming`. Set when the stream has completed and the final
   * document version is ready to be persisted. Not typically set by backend code.
   */
  streamReadyForFinal?: boolean;
  /** Arbitrary per-instance metadata bag for user-defined data. Not used by the framework. */
  data?: any;
}
