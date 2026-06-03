import type { DocumentEntity } from '../entities/index.js';
import type { DocumentClass, DocumentSaveOptions } from './document-repository.interface.js';

/**
 * Document store for workflow and tool authors.
 *
 * Available as `this.documentStore` on BaseWorkflow and BaseTool (no manual injection needed).
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
