import { DocumentEntity } from '../entities/document.entity';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type DocumentClass<T = any> = Function & { new (...args: any[]): T; prototype: T };

export interface DocumentSaveOptions {
  id?: string;
  meta?: Record<string, unknown>;
  validate?: 'strict' | 'safe' | 'skip';
}

export interface DocumentRepository {
  /**
   * Instantiate a document DTO without persisting.
   * Validates content against the document's Zod schema and returns a typed instance.
   */
  create<T extends object>(documentClass: DocumentClass<T>, data: T): T;

  /**
   * Validate, instantiate, and persist a document from a class + data.
   */
  save<T extends object>(
    documentClass: DocumentClass<T>,
    data: T,
    options?: DocumentSaveOptions,
  ): Promise<DocumentEntity>;

  /**
   * Persist an already-created document instance.
   */
  save<T extends object>(instance: T, options?: DocumentSaveOptions): Promise<DocumentEntity>;

  /**
   * Find all documents of a given type, hydrated as typed instances.
   */
  findAll<T extends object>(documentClass: DocumentClass<T>): T[];

  /**
   * Find all documents matching a tag.
   */
  findByTag(tag: string): DocumentEntity[];
}
