import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  DocumentClass,
  DocumentEntity,
  DocumentRepository,
  DocumentSaveOptions,
  getBlockTypeFromMetadata,
  getDocumentSchema,
} from '@loopstack/common';
import { ExecutionScope } from '../utils';
import { DocumentPersistenceService } from './document-persistence.service';

/**
 * Implements the DocumentRepository interface for workflow and tool authors.
 *
 * Provided as `this.repository` on workflows and tools via the execution proxy.
 * Uses class-transformer to hydrate document DTOs from plain data.
 */
@Injectable()
export class DocumentRepositoryService implements DocumentRepository {
  constructor(
    private readonly executionScope: ExecutionScope,
    private readonly documentPersistenceService: DocumentPersistenceService,
  ) {}

  create<T extends object>(documentClass: DocumentClass<T>, data: object): T {
    const schema = getDocumentSchema(documentClass);
    const validated = schema ? (schema.parse(data) as Record<string, unknown>) : data;
    return plainToInstance(documentClass, validated);
  }

  save<T extends object>(
    classOrInstance: DocumentClass<T> | T,
    dataOrOptions?: object | DocumentSaveOptions,
    maybeOptions?: DocumentSaveOptions,
  ): Promise<DocumentEntity> {
    const isClass = typeof classOrInstance === 'function';

    if (isClass) {
      // save(DocumentClass, data, options?)
      const documentClass = classOrInstance as DocumentClass<T>;
      const data = dataOrOptions as object;
      const options = maybeOptions;
      const blockName = documentClass.name;

      return Promise.resolve(this.documentPersistenceService.create(blockName, documentClass, data, options));
    } else {
      // save(instance, options?)
      const instance = classOrInstance as T;
      const options = dataOrOptions as DocumentSaveOptions | undefined;
      const documentClass = instance.constructor;
      const blockName = documentClass.name;

      // Serialize instance to plain object for persistence
      const data = Object.assign({}, instance) as Record<string, unknown>;

      return Promise.resolve(this.documentPersistenceService.create(blockName, documentClass, data, options));
    }
  }

  findAll<T extends object>(documentClass: DocumentClass<T>): T[] {
    const ctx = this.executionScope.get();
    const documents = ctx.getManager().getData('documents') as DocumentEntity[];
    const className = documentClass.name;

    return documents
      .filter((d) => !d.isInvalidated && d.className === className)
      .map((d) => plainToInstance(documentClass, d.content as Record<string, unknown>));
  }

  findByTag(tag: string): DocumentEntity[] {
    const ctx = this.executionScope.get();
    const documents = ctx.getManager().getData('documents') as DocumentEntity[];

    return documents.filter((d) => !d.isInvalidated && d.tags?.includes(tag));
  }

  /**
   * Check if a value is a document class (has @Document metadata).
   */
  static isDocumentClass(value: unknown): boolean {
    return typeof value === 'function' && getBlockTypeFromMetadata(value as object) === 'document';
  }
}
