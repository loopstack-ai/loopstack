import type { DocumentEntity } from '../entities/index.js';
import type { DocumentClass, DocumentSaveOptions } from './document-repository.interface.js';

/**
 * Document store for workflow and tool authors.
 *
 * Inject via token: `@Inject(DOCUMENT_STORE) private documentStore: DocumentStore`
 * Or via direct class import from `@loopstack/core` (adds core dependency).
 */
export interface DocumentStore {
  create<T extends object>(documentClass: DocumentClass<T>, data: T): T;
  save<T extends object>(
    classOrInstance: DocumentClass<T> | T,
    dataOrOptions?: T | DocumentSaveOptions,
    maybeOptions?: DocumentSaveOptions,
  ): Promise<DocumentEntity>;
  findAll<T extends object>(documentClass: DocumentClass<T>): T[];
  findAllDocuments(): DocumentEntity[];
  findByTag(tag: string): DocumentEntity[];
}
