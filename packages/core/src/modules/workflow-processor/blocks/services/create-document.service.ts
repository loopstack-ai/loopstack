import { Injectable, Logger } from '@nestjs/common';
import {
  HandlerCallResult,
  DocumentEntity,
  TemplateExpression,
  MimeTypeSchema,
  DocumentSchema,
  UISchema, JSONSchemaType, DocumentConfigType, ExecutionContext,
} from '@loopstack/shared';
import { DocumentType } from '@loopstack/shared';
import { z } from 'zod';
import { merge, omit } from 'lodash';
import { BlockRegistryService, ConfigTraceError } from '../../../configuration';
import { DocumentService } from '../../../persistence';
import { TemplateExpressionEvaluatorService } from '../../services';
import { SchemaValidationError } from '../../errors';
import { Document } from '../../abstract';
import { ServiceStateFactory } from '../../services/service-state-factory.service';

export const CreateDocumentInputSchema = z
  .object({
    document: z.string(),
    validate: z.union([
      z.literal('strict'),
      z.literal('safe'),
      z.literal('skip'),
    ]).default('strict').optional(),
    update: z
      .object({
        content: z.any(),
        schema: JSONSchemaType.optional(),
        ui: UISchema.optional(),
        tags: z.array(z.string()).optional(),
        meta: z
          .object({
            mimeType: MimeTypeSchema.optional(),
            invalidate: z.boolean().optional(),
            level: z
              .union([
                z.literal('debug'),
                z.literal('info'),
                z.literal('warning'),
                z.literal('error'),
              ])
              .optional(),
            enableAtPlaces: z.array(z.string()).optional(),
            hideAtPlaces: z.array(z.string()).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .strict();

export type CreateDocumentInput = z.infer<typeof CreateDocumentInputSchema>;

export const CreateDocumentConfigSchema = z
  .object({
    document: z.string(),
    validate: z.union([
      TemplateExpression,
      z.literal('strict'),
      z.literal('safe'),
      z.literal('skip'),
    ]).optional(),
    update: z
      .object({
        content: z.any(),
        ui: z.union([
          UISchema,
          TemplateExpression,
        ]).optional(),
        schema: z.union([
          JSONSchemaType,
          TemplateExpression,
        ]).optional(),
        tags: z.array(z.string()).optional(),
        meta: z
          .object({
            mimeType: z.union([MimeTypeSchema, TemplateExpression]).optional(),
            invalidate: z.union([z.boolean(), TemplateExpression]).optional(),
            level: z
              .union([
                TemplateExpression,
                z.literal('debug'),
                z.literal('info'),
                z.literal('warning'),
                z.literal('error'),
              ])
              .optional(),
            enableAtPlaces: z.array(z.string()).optional(),
            hideAtPlaces: z.array(z.string()).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .strict();

@Injectable()
export class CreateDocumentService {
  private readonly logger = new Logger(CreateDocumentService.name);

  constructor(
    private documentService: DocumentService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly blockRegistryService: BlockRegistryService,
    private readonly serviceStateFactory: ServiceStateFactory,
  ) {}

  async createDocument(
    ctx: ExecutionContext<CreateDocumentInput>,
  ): Promise<HandlerCallResult> {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }

    const blockRegistryItem = this.blockRegistryService.getBlock(ctx.args.document);
    if (!blockRegistryItem) {
      throw new Error(`Document ${ctx.args.document} not found.`);
    }
    const documentBlock = await this.serviceStateFactory.createBlockInstance<Document>(blockRegistryItem);
    documentBlock.initDocument(
      ctx.parentArgs,
    )

    const config = documentBlock.config as DocumentConfigType;

    try {
      // merge the custom properties
      const mergedTemplateData = merge({}, config, ctx.args.update ?? {});

      // create the document skeleton without content property
      const documentSkeleton =
        this.templateExpressionEvaluatorService.parse<DocumentType>(
          omit(mergedTemplateData, ['content']),
          { this: documentBlock.toOutputObject() },
          {
            schema: DocumentSchema,
          },
        );

      const inputSchema = documentBlock.metadata.properties;
      if (!inputSchema && mergedTemplateData.content) {
        throw Error(`Document creates with content no schema defined.`);
      }

      // evaluate and parse document content using document schema
      const parsedDocumentContent = mergedTemplateData.content
        ? this.templateExpressionEvaluatorService.parse<DocumentType>(
          mergedTemplateData.content,
          { this: documentBlock.toOutputObject() },
          // do not add schema here, we validate later
        )
        : null;

      // merge document skeleton with content data
      const documentData: Partial<DocumentEntity> = {
        name: documentBlock.name,
        ...documentSkeleton,
        content: parsedDocumentContent,
        configKey: documentBlock.name,
      };

      // do final strict validation
      if (inputSchema && ctx.args.validate !== 'skip') {
        const result = inputSchema.safeParse(documentData.content);
        if (!result.success) {
          if (ctx.args.validate === 'strict') {
            this.logger.error(result.error);
            throw new SchemaValidationError('Document schema validation failed (strict)')
          }

          documentData.validationError = result.error;
        }
      }

      // create the document entity
      const document = this.documentService.create(
        ctx.context.workspaceId,
        ctx.context.pipelineId,
        ctx.context.userId,
        ctx.workflow,
        ctx.transitionData,
        documentData,
      );

      this.logger.debug(`Created document "${documentData.name}".`);

      return {
        success: true,
        persist: true,
        workflow: ctx.workflow,
        data: document,
      };
    } catch (e) {
      throw new ConfigTraceError(e, documentBlock);
    }
  }
}
