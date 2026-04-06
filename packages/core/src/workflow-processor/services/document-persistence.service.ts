import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { merge } from 'lodash';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { ZodError, toJSONSchema } from 'zod';
import {
  DocumentEntity,
  DocumentSaveOptions,
  WorkflowEntity,
  getBlockConfig,
  getDocumentSchema,
} from '@loopstack/common';
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
   * Creates and persists a document entity.
   *
   * @param blockName - Name used for the document (typically the class name)
   * @param documentClass - The document class (constructor or instance) for reading metadata
   * @param content - The content data to persist
   * @param options - Optional save options (id, meta, validate)
   */
  create(blockName: string, documentClass: object, content: unknown, options?: DocumentSaveOptions): DocumentEntity {
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
      blockName,
      className: typeof documentClass === 'function' ? documentClass.name : documentClass.constructor.name,
      content: validatedContent,
      meta: Object.keys(mergedMeta).length > 0 ? mergedMeta : null,
      error: error ?? null,
      schema: jsonSchema as Record<string, unknown> | undefined,
      ui: config?.ui ?? null,
      tags: (config?.tags as string[]) ?? [],
      transition: transition.id,
      place: transition.to,
      labels: runContext.labels,
      workflow: { id: runContext.workflowId } as WorkflowEntity,
      workflowId: runContext.workflowId,
      workspaceId: runContext.workspaceId,
      createdBy: runContext.userId,
    });

    this.addDocument(ctx, entity);
    return entity;
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

  private addDocument(ctx: WorkflowExecutionContextManager, document: DocumentEntity): void {
    const documents = ctx.getManager().getData('documents');

    const existingIndex = document.messageId ? documents.findIndex((d) => d.messageId === document.messageId) : -1;

    if (existingIndex !== -1) {
      document.index = existingIndex;
      documents[existingIndex] = document;
    } else {
      let inheritedIndex: number | undefined;
      for (const doc of documents) {
        if (doc.messageId === document.messageId && doc.meta?.invalidate !== false) {
          if (inheritedIndex === undefined) {
            inheritedIndex = doc.index;
          }
          doc.isInvalidated = true;
        }
      }

      document.index = inheritedIndex ?? documents.length;
      this.logger.debug(
        `addDocument: ${document.blockName}(messageId=${document.messageId}) → index=${document.index} (inherited=${inheritedIndex !== undefined}, docCount=${documents.length})`,
      );
      documents.push(document);
    }

    ctx.getManager().setData('documents', documents);
    ctx.getManager().setData('persistenceState', { documentsUpdated: true });
  }
}
