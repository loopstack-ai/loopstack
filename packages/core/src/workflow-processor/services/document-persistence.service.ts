import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { ZodError } from 'zod';
import { DocumentEntity, DocumentSaveOptions, getBlockOptions, getDocumentSchema } from '@loopstack/common';
import { SchemaValidationError } from '../../common/index.js';
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
    const { content: validatedContent, error } = this.validateContent(contentSchema, content, validateMode);

    // Generate messageId if not provided
    const messageId = options?.id ?? randomUUID();

    const entity = this.documentRepository.create({
      messageId,
      documentName,
      content: validatedContent,
      meta: dynamicMeta && Object.keys(dynamicMeta).length > 0 ? dynamicMeta : null,
      error: error ?? null,
      tags: defaultTags,
      transition: transition.id,
      place: transition.to,
      labels: scope.labels,
      workflowId: scope.workflowId,
      workspaceId: scope.workspaceId,
      createdBy: scope.userId,
    });

    // Set index and update in-memory cache first (handles invalidation of previous versions)
    await this.addToCache(scope, entity);

    // Stateless workflows have no persistence
    if (scope.options.stateless) {
      return entity;
    }

    // Persist within the active transaction, or directly if called outside one (e.g. error documents after rollback)
    return scope.queryRunner
      ? scope.queryRunner.manager.save(DocumentEntity, entity)
      : this.documentRepository.save(entity);
  }

  /**
   * Updates the in-memory document cache. Handles invalidation of previous
   * versions (by messageId) and index inheritance. Persists invalidation
   * changes to DB when a queryRunner is available.
   */
  private async addToCache(scope: ExecutionScopeData, document: DocumentEntity): Promise<void> {
    const { documents, queryRunner } = scope;

    const existingIndex = document.messageId ? documents.findIndex((d) => d.messageId === document.messageId) : -1;

    // Collect all existing documents with the same messageId that need invalidation
    const invalidated: DocumentEntity[] = [];
    let inheritedIndex: number | undefined;

    for (const doc of documents) {
      if (doc.messageId === document.messageId && doc.meta?.invalidate !== false) {
        if (inheritedIndex === undefined) {
          inheritedIndex = doc.index;
        }
        doc.isInvalidated = true;
        if (doc.id) {
          invalidated.push(doc);
        }
      }
    }

    // Persist invalidation to DB
    if (invalidated.length > 0 && !scope.options.stateless) {
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

    if (existingIndex !== -1) {
      document.index = documents[existingIndex].index;
      documents[existingIndex] = document;
    } else {
      document.index = inheritedIndex ?? documents.length;
      this.logger.debug(
        `addDocument: ${document.documentName}(messageId=${document.messageId}) → index=${document.index} (inherited=${inheritedIndex !== undefined}, docCount=${documents.length})`,
      );
      documents.push(document);
    }

    scope.persistenceState = { documentsUpdated: true };
  }

  private validateContent(
    schema: import('zod').ZodType | undefined,
    content: unknown,
    mode: 'strict' | 'safe' | 'skip',
  ): { content: unknown; error?: ZodError } {
    if (!schema || mode === 'skip') {
      return { content };
    }

    const result = schema.safeParse(content);

    if (!result.success) {
      if (mode === 'strict') {
        this.logger.error(result.error);
        throw new SchemaValidationError('Document schema validation failed (strict mode)');
      }

      // safe mode: store partial data + validation error
      return { content: result.data, error: result.error };
    }

    return { content: result.data };
  }
}
