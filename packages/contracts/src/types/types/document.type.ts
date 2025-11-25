import { z } from 'zod';
import { DocumentConfigSchema, DocumentMessageSchema, DocumentSchema, MimeTypeSchema } from '../../schemas';

export type MimeType = z.infer<typeof MimeTypeSchema>;
export type DocumentConfigType = z.infer<typeof DocumentConfigSchema>;
export type DocumentType = z.infer<typeof DocumentSchema>;
export type DocumentMessageType = z.infer<typeof DocumentMessageSchema>;