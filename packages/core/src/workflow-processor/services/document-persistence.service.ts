import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { ZodError } from 'zod';
import { DocumentEntity, DocumentSaveOptions, getBlockOptions, getDocumentSchema } from '@loopstack/common';
import { SchemaValidationError, TransitionAbortedError } from '../../common/index.js';
import { ExecutionScope, ExecutionScopeData } from '../utils/index.js';

@Injectable()
export class DocumentPersistenceService {
  private readonly logger = new Logger(DocumentPersistenceService.name);

  constructor(
    private readonly executionScope: ExecutionScope,
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
  ) {}

  /**
   * Creates, persists, and caches a document entity.
   *
   * - Stateless workflows: document is added to the in-memory cache only, no DB write.
   * - Stateful workflows within a transition: document is written inside the active transaction.
   * - Stateful workflows outside a transaction (e.g. error documents after rollback): document is
   *   written via the plain repository outside any transaction.
   */
  async create(
    documentName: string,
    documentClass: object,
    content: unknown,
    options?: DocumentSaveOptions,
  ): Promise<DocumentEntity> {
    const scope = this.executionScope.get();

    // Refuse writes from an abandoned (timed-out) transition. Without this, a zombie method whose
    // transaction was already rolled back would hit the plain-repository branch below and commit a
    // document outside any transaction.
    if (scope.abortController.signal.aborted) {
      throw new TransitionAbortedError();
    }

    const transition = scope.transition;
    if (!transition) {
      throw new Error('DocumentPersistenceService.create() called outside an active transition');
    }

    // Read options and schema from the document class decorator
    const blockOptions = getBlockOptions(documentClass);
    const contentSchema = getDocumentSchema(documentClass);

    // Only persist dynamic meta from save options (no static meta merging)
    const dynamicMeta = options?.meta ?? null;

    // Default tags from decorator
    const defaultTags = blockOptions?.tags ?? [];

    // Validate content against document schema
    const validateMode = options?.validate ?? 'strict';
    const { content: validatedContent, error } = this.validateContent(
      contentSchema,
      content,
      validateMode,
      documentName,
    );

    // Generate key if not provided
    const key = options?.key ?? randomUUID();

    const entity = this.documentRepository.create({
      key,
      documentName,
      content: validatedContent,
      meta: dynamicMeta && Object.keys(dynamicMeta).length > 0 ? dynamicMeta : null,
      error: error ?? null,
      tags: defaultTags,
      internal: blockOptions?.internal ?? false,
      transition: transition.id,
      place: transition.to,
      labels: scope.labels,
      workflowId: scope.workflowId,
      workspaceId: scope.workspaceId,
      createdBy: scope.userId,
    });

    // Set index and update in-memory cache first (handles invalidation of previous versions)
    await this.addToCache(scope, entity, options?.position ?? 'end');

    // Stateless workflows have no persistence
    if (scope.options?.stateless) {
      return entity;
    }

    // Persist within the active transaction, or directly if called outside one (e.g. error documents after rollback)
    return scope.queryRunner
      ? scope.queryRunner.manager.save(DocumentEntity, entity)
      : this.documentRepository.save(entity);
  }

  /**
   * Updates the in-memory document cache. Handles invalidation of previous
   * versions (by key) and the new version's index: appended (`end`), or in the
   * place of the latest previous version (`keep`). Persists invalidation
   * changes to DB when a queryRunner is available.
   */
  private async addToCache(
    scope: ExecutionScopeData,
    document: DocumentEntity,
    position: NonNullable<DocumentSaveOptions['position']>,
  ): Promise<void> {
    const { documents, queryRunner } = scope;

    // The latest previous version — the one a `keep` save takes the place of. Not the first: a revision
    // that moved to the end and is then updated in place stays where it moved to.
    let previous = -1;
    for (let i = documents.length - 1; i >= 0; i--) {
      if (documents[i].key === document.key) {
        previous = i;
        break;
      }
    }

    // Collect all existing documents with the same key that need invalidation
    const invalidated: DocumentEntity[] = [];
    let supersedes = false;

    for (const doc of documents) {
      if (doc.key === document.key && doc.meta?.invalidate !== false) {
        supersedes = true;
        doc.isInvalidated = true;
        if (doc.id) {
          invalidated.push(doc);
        }
      }
    }

    // Persist invalidation to DB
    if (invalidated.length > 0 && !scope.options?.stateless) {
      if (queryRunner) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(DocumentEntity)
          .set({ isInvalidated: true })
          .whereInIds(invalidated.map((d) => d.id))
          .execute();
      } else {
        await this.documentRepository.update(
          invalidated.map((d) => d.id),
          { isInvalidated: true },
        );
      }
    }

    if (position === 'keep' && previous !== -1) {
      document.index = documents[previous].index;
      documents[previous] = document;
    } else {
      // The cache is loaded with every stored row, invalidated ones included, and never shrinks; an index is
      // only ever handed out below its length. So the length is an index no document of the workflow has.
      document.index = documents.length;
      this.logger.debug(
        `addDocument: ${document.documentName}(key=${document.key}) → index=${document.index} (supersedes=${supersedes}, docCount=${documents.length})`,
      );
      documents.push(document);
    }

    scope.trace.emit({
      type: 'document.emitted',
      transitionId: scope.transition?.id,
      ...(document.id ? { documentId: document.id } : {}),
      ...(document.key ? { key: document.key } : {}),
      documentName: document.documentName,
      ...(supersedes ? { invalidatedKey: document.key } : {}),
    });

    scope.persistenceState = { documentsUpdated: true };
  }

  private validateContent(
    schema: import('zod').ZodType | undefined,
    content: unknown,
    mode: 'strict' | 'safe' | 'skip',
    documentName: string,
  ): { content: unknown; error?: ZodError } {
    if (!schema || mode === 'skip') {
      return { content };
    }

    const result = schema.safeParse(content);

    if (!result.success) {
      if (mode === 'strict') {
        this.logger.error(result.error);
        const issues = result.error.issues
          .map((i) => `${i.path.length ? i.path.join('.') : '<root>'}: ${i.message}`)
          .join('; ');
        throw new SchemaValidationError(`Document '${documentName}' failed schema validation (strict mode): ${issues}`);
      }

      // safe mode: store partial data + validation error
      return { content: result.data, error: result.error };
    }

    return { content: result.data };
  }
}
