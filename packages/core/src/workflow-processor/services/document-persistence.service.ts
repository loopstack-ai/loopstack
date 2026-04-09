import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { merge } from 'lodash';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { ZodError, toJSONSchema } from 'zod';
import { DocumentEntity, DocumentSaveOptions, getBlockConfig, getDocumentSchema } from '@loopstack/common';
import { DocumentConfigType } from '@loopstack/contracts/types';
import { SchemaValidationError } from '../../common';
import { ExecutionScope, WorkflowExecutionContextManager } from '../utils';

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
   * When a queryRunner is available on the execution context (stateful workflows),
   * the document is written to the DB immediately within the transition's transaction.
   * For stateless workflows (no queryRunner), the document is only added to the
   * in-memory cache.
   */
  async create(
    className: string,
    documentClass: object,
    content: unknown,
    options?: DocumentSaveOptions,
  ): Promise<DocumentEntity> {
    const ctx = this.executionScope.get();
    const runContext = ctx.getContext();
    const metadata = ctx.getData();
    const transition = metadata.transition!;

    // Read config and schema from the document class
    const config = getBlockConfig<DocumentConfigType>(documentClass);
    const contentSchema = getDocumentSchema(documentClass);
    const jsonSchema = contentSchema ? toJSONSchema(contentSchema) : undefined;

    // Merge document config defaults with caller-provided values
    const mergedMeta = merge({}, config?.meta ?? {}, options?.meta ?? {});

    // Validate content against document schema
    const validateMode = options?.validate ?? 'strict';
    const { content: validatedContent, error } = this.validateContent(contentSchema, content, validateMode);

    // Generate messageId if not provided
    const messageId = options?.id ?? randomUUID();

    const entity = this.documentRepository.create({
      messageId,
      alias: className,
      className,
      content: validatedContent,
      meta: Object.keys(mergedMeta).length > 0 ? mergedMeta : null,
      error: error ?? null,
      schema: jsonSchema as Record<string, unknown> | undefined,
      ui: config?.ui ?? null,
      tags: (config?.tags as string[]) ?? [],
      transition: transition.id,
      place: transition.to,
      labels: runContext.labels,
      workflowId: runContext.workflowId!,
      workspaceId: runContext.workspaceId,
      createdBy: runContext.userId,
    });

    // Set index and update in-memory cache first (handles invalidation of previous versions)
    await this.addToCache(ctx, entity);

    // Persist to DB with correct index via scoped transaction when available
    const queryRunner = ctx.getQueryRunner();
    const saved = queryRunner ? await queryRunner.manager.save(DocumentEntity, entity) : entity;

    return saved;
  }

  /**
   * Updates the in-memory document cache. Handles invalidation of previous
   * versions (by messageId) and index inheritance. Persists invalidation
   * changes to DB when a queryRunner is available.
   *
   * Shared by both direct document creation and tool side-effect processing.
   */
  async addToCache(ctx: WorkflowExecutionContextManager, document: DocumentEntity): Promise<void> {
    const documents = ctx.getManager().getData('documents');
    const queryRunner = ctx.getQueryRunner();

    const existingIndex = document.messageId ? documents.findIndex((d) => d.messageId === document.messageId) : -1;

    // Collect all existing documents with the same messageId that need invalidation
    const invalidated: DocumentEntity[] = [];
    let inheritedIndex: number | undefined;
    let inheritedVersion: number | undefined;

    for (const doc of documents) {
      if (doc.messageId === document.messageId && doc.meta?.invalidate !== false) {
        if (inheritedIndex === undefined) {
          inheritedIndex = doc.index;
          inheritedVersion = doc.version;
        }
        doc.isInvalidated = true;
        if (doc.id) {
          invalidated.push(doc);
        }
      }
    }

    // Persist invalidation to DB
    if (queryRunner && invalidated.length > 0) {
      await queryRunner.manager
        .createQueryBuilder()
        .update(DocumentEntity)
        .set({ isInvalidated: true })
        .whereInIds(invalidated.map((d) => d.id))
        .execute();
    }

    // Bump version when replacing an existing document
    if (inheritedVersion !== undefined) {
      document.version = inheritedVersion + 1;
    }

    if (existingIndex !== -1) {
      document.index = documents[existingIndex].index;
      documents[existingIndex] = document;
    } else {
      document.index = inheritedIndex ?? documents.length;
      this.logger.debug(
        `addDocument: ${document.alias}(messageId=${document.messageId}) → index=${document.index} (inherited=${inheritedIndex !== undefined}, docCount=${documents.length})`,
      );
      documents.push(document);
    }

    ctx.getManager().setData('documents', documents);
    ctx.getManager().setData('persistenceState', { documentsUpdated: true });
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
