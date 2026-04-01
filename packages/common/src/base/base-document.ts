import { Injectable } from '@nestjs/common';
import { DocumentEntity } from '../entities/document.entity';

export interface CreateDocumentOptions<TContent = any> {
  content: TContent;
  id?: string;
  meta?: Record<string, unknown>;
}

/**
 * Base class for documents in the TypeScript-first workflow model.
 *
 * Document classes extend this to get `.create()` and `._create()` methods.
 * The workflow proxy intercepts `.create()` calls and redirects them to
 * `._create()`, which is wired by the processor to DocumentPersistenceService.
 */
@Injectable()
export class BaseDocument<TContent = any> {
  /** Public API for workflow authors */
  create(options: CreateDocumentOptions<TContent>): Promise<DocumentEntity> {
    return this._create(options);
  }

  /**
   * Internal entry point wired by the workflow processor at runtime.
   * The proxy redirects .create() → ._create() → DocumentPersistenceService.
   */
  _create(_options: CreateDocumentOptions<TContent>): Promise<DocumentEntity> {
    return Promise.reject(
      new Error(
        'BaseDocument._create() was called but has not been wired. ' +
          'Ensure the document is used within a workflow transition with an active ExecutionScope.',
      ),
    );
  }
}
