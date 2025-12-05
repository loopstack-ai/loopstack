import {
  BlockConfig,
  DocumentEntity,
  HandlerCallResult,
} from '@loopstack/common';
import { Logger } from '@nestjs/common';
import { BlockRegistryService, Tool } from '../../../workflow-processor';
import { DocumentConfigType, DocumentType } from '@loopstack/contracts/types';
import { merge, omit } from 'lodash';
import {
  DocumentConfigSchema,
  DocumentSchema,
  TemplateExpression,
} from '@loopstack/contracts/schemas';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { plainToInstance } from 'class-transformer';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { DocumentService } from '../services/document.service';
import {
  ConfigTraceError,
  SchemaValidationError,
  TemplateExpressionEvaluatorService,
} from '../../../common';

export const CreateDocumentInputSchema = z
  .object({
    id: z.string().optional(),
    document: z.string(),
    validate: z
      .union([z.literal('strict'), z.literal('safe'), z.literal('skip')])
      .default('strict')
      .optional(),
    update: DocumentSchema.optional(),
  })
  .strict();

export type CreateDocumentInput = z.infer<typeof CreateDocumentInputSchema>;

export const CreateDocumentConfigSchema = z
  .object({
    id: z.union([TemplateExpression, z.string()]).optional(),
    document: z.string(),
    validate: z
      .union([
        TemplateExpression,
        z.literal('strict'),
        z.literal('safe'),
        z.literal('skip'),
      ])
      .optional(),
    update: DocumentConfigSchema.optional(),
  })
  .strict();

@BlockConfig({
  config: {
    description: 'Create a document.',
  },
  properties: CreateDocumentInputSchema,
  configSchema: CreateDocumentConfigSchema,
})
export class CreateDocument extends Tool {
  protected readonly logger = new Logger(CreateDocument.name);

  constructor(
    private readonly documentService: DocumentService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly blockRegistryService: BlockRegistryService,
  ) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    const document = this.createDocument(this.args);

    return {
      data: document,
      effects: {
        addWorkflowDocuments: [document],
      },
    };
  }

  private createDocument(args: CreateDocumentInput): DocumentEntity {
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
          this,
          ['document'],
          DocumentSchema,
        );

      const inputSchema = blockRegistryItem.metadata.properties;
      if (!inputSchema && mergedTemplateData.content) {
        throw Error(`Document creates with content no schema defined.`);
      }

      const jsonSchema = zodToJsonSchema(inputSchema as any, {
        name: 'documentSchema',
        target: 'jsonSchema7',
      })?.definitions?.documentSchema;

      // evaluate document content
      const parsedDocumentContent =
        this.templateExpressionEvaluatorService.evaluateTemplate<any>(
          mergedTemplateData.content,
          this,
          ['document'],
        );

      const documentContent = plainToInstance(
        blockRegistryItem.provider.metatype as any,
        parsedDocumentContent,
        {
          excludeExtraneousValues: true,
        },
      );

      const messageId = args.id
        ? this.templateExpressionEvaluatorService.evaluateTemplate<any>(
            args.id,
            this,
            ['document'],
            z.string(),
          )
        : undefined;

      // merge document skeleton with content data
      const documentData: Partial<DocumentEntity> = {
        ...documentSkeleton,
        schema: jsonSchema,
        messageId: messageId || randomUUID(),
        content: documentContent,
        blockName: blockRegistryItem.name,
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

          documentData.error = result.error;
        }
      }

      // create the document entity
      const documentEntity = this.documentService.create(this, documentData);

      this.logger.debug(`Created document "${documentData.messageId}".`);

      return documentEntity;
    } catch (e) {
      throw new ConfigTraceError(e, blockRegistryItem.provider.instance);
    }
  }
}
