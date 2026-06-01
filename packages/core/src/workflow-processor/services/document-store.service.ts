import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  DocumentClass,
  DocumentEntity,
  DocumentSaveOptions,
  getBlockTypeFromMetadata,
  getDocumentSchema,
} from '@loopstack/common';
import { ExecutionScope } from '../utils/index.js';
import { DocumentPersistenceService } from './document-persistence.service.js';

/**
 * Document store for workflow and tool authors.
 *
 * Provides save/findAll/findByTag for documents associated with the current workflow execution.
 * Internally reads document cache from ExecutionScope.
 *
 * Injected via constructor on concrete workflow/tool classes:
 * ```ts
 * constructor(private documentStore: DocumentStore) {}
 * ```
 */
@Injectable()
export class DocumentStore {
  constructor(
    private readonly executionScope: ExecutionScope,
    private readonly documentPersistenceService: DocumentPersistenceService,
  ) {}

  /**
   * Instantiate a document DTO without persisting.
   * Validates content against the document's Zod schema and returns a typed instance.
   */
  create<T extends object>(documentClass: DocumentClass<T>, data: T): T {
    const schema = getDocumentSchema(documentClass);
    const validated = schema ? (schema.parse(data) as Record<string, unknown>) : data;
    return plainToInstance(documentClass, validated);
  }

  /**
   * Validate, instantiate, and persist a document.
   */
  async save<T extends object>(
    classOrInstance: DocumentClass<T> | T,
    dataOrOptions?: T | DocumentSaveOptions,
    maybeOptions?: DocumentSaveOptions,
  ): Promise<DocumentEntity> {
    const isClass = typeof classOrInstance === 'function';

    if (isClass) {
      const documentClass = classOrInstance;
      const data = dataOrOptions as T;
      const options = maybeOptions;
      return this.documentPersistenceService.create(documentClass.name, documentClass, data, options);
    } else {
      const instance = classOrInstance;
      const options = dataOrOptions as DocumentSaveOptions | undefined;
      const documentClass = instance.constructor;
      const data = Object.assign({}, instance) as Record<string, unknown>;
      return this.documentPersistenceService.create(documentClass.name, documentClass, data, options);
    }
  }

  /**
   * Find all non-invalidated documents of a given type, hydrated as typed instances.
   */
  findAll<T extends object>(documentClass: DocumentClass<T>): T[] {
    const scope = this.executionScope.get();
    const className = documentClass.name;

    return scope.documents
      .filter((d) => !d.isInvalidated && d.className === className)
      .map((d) => plainToInstance(documentClass, d.content as Record<string, unknown>));
  }

  /**
   * Find all non-invalidated documents as raw DocumentEntity[].
   * Useful for LLM tools that need all documents regardless of type.
   */
  findAllDocuments(): DocumentEntity[] {
    const scope = this.executionScope.get();
    return scope.documents.filter((d) => !d.isInvalidated);
  }

  /**
   * Find all documents matching a tag.
   */
  findByTag(tag: string): DocumentEntity[] {
    const scope = this.executionScope.get();
    return scope.documents.filter((d) => !d.isInvalidated && d.tags?.includes(tag));
  }

  /**
   * Check if a value is a document class (has @Document metadata).
   */
  static isDocumentClass(value: unknown): boolean {
    return typeof value === 'function' && getBlockTypeFromMetadata(value as object) === 'document';
  }
}
