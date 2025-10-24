import { Injectable, Logger } from '@nestjs/common';
import {
  HandlerCallResult,
  DocumentEntity,
  TemplateExpression,
  MimeTypeSchema,
  DocumentSchema,
  UISchema,
  JSONSchemaType,
  DocumentConfigType,
} from '@loopstack/shared';
import { DocumentType } from '@loopstack/shared';
import { z } from 'zod';
import { merge, omit } from 'lodash';
import { DocumentService } from '../../persistence';
import {
  BlockRegistryService, ConfigTraceError, Document,
  SchemaValidationError,
  TemplateExpressionEvaluatorService,
  Tool,
} from '../../workflow-processor';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { plainToInstance } from 'class-transformer';

export const CreateDocumentInputSchema = z
  .object({
    document: z.string(),
    validate: z
      .union([z.literal('strict'), z.literal('safe'), z.literal('skip')])
      .default('strict')
      .optional(),
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
    validate: z
      .union([
        TemplateExpression,
        z.literal('strict'),
        z.literal('safe'),
        z.literal('skip'),
      ])
      .optional(),
    update: z
      .object({
        content: z.any(),
        ui: z.union([UISchema, TemplateExpression]).optional(),
        schema: z.union([JSONSchemaType, TemplateExpression]).optional(),
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
    private readonly documentService: DocumentService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly blockRegistryService: BlockRegistryService,
  ) {}

  createDocument(
    args: CreateDocumentInput,
    tool: Tool,
  ): DocumentEntity {
    const blockRegistryItem = this.blockRegistryService.getBlock(args.document);
    if (!blockRegistryItem) {
      throw new Error(`Document ${args.document} not found.`);
    }

    const config = blockRegistryItem.config as DocumentConfigType;

    try {
      // merge the custom properties
      const mergedTemplateData = merge({}, config, args.update ?? {});

      // create the document skeleton without content property
      const documentSkeleton =
        this.templateExpressionEvaluatorService.evaluateTemplate<
          Omit<DocumentType, 'content'>
        >(
          omit(mergedTemplateData, ['content']),
          tool,
          ['document'],
          DocumentSchema,
        );

      const inputSchema = blockRegistryItem.metadata.properties;
      if (!inputSchema && mergedTemplateData.content) {
        throw Error(`Document creates with content no schema defined.`);
      }

      let schema = mergedTemplateData.schema;
      if (!schema) {
        schema = zodToJsonSchema(inputSchema as any, {
          name: 'documentSchema',
          target: 'jsonSchema7',
        })?.definitions?.documentSchema;
      }

      // evaluate document content
      const parsedDocumentContent =
        this.templateExpressionEvaluatorService.evaluateTemplate<any>(
          mergedTemplateData.content,
          tool,
          ['document'],
        );

      const documentContent = plainToInstance(blockRegistryItem.provider.metatype as any, parsedDocumentContent, {
        excludeExtraneousValues: true,
      });

      console.log(documentContent);

      // merge document skeleton with content data
      const documentData: Partial<DocumentEntity> = {
        ...documentSkeleton,
        schema,
        name: blockRegistryItem.name,
        content: documentContent,
        configKey: blockRegistryItem.name,
      };

      // do final strict validation
      if (inputSchema && args.validate !== 'skip') {
        const result = inputSchema.safeParse(documentData.content);
        if (!result.success) {
          if (args.validate === 'strict') {
            this.logger.error(result.error);
            throw new SchemaValidationError(
              'Document schema validation failed (strict)',
            );
          }

          documentData.validationError = result.error;
        }
      }

      // create the document entity
      const documentEntity = this.documentService.create(tool, documentData);

      this.logger.debug(`Created document "${documentData.name}".`);

      return documentEntity;
    } catch (e) {
      throw new ConfigTraceError(e, blockRegistryItem.provider.instance);
    }
  }
}
