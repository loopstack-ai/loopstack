import {
  BlockConfig,
  DocumentEntity,
  ToolResult, WithArguments,
} from '@loopstack/common';
import { Logger } from '@nestjs/common';
import { DocumentConfigType, DocumentType } from '@loopstack/contracts/types';
import { merge, omit } from 'lodash';
import {
  DocumentConfigSchema,
  DocumentSchema,
  TemplateExpression,
} from '@loopstack/contracts/schemas';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {
  Block, ConfigTraceError, DocumentService,
  SchemaValidationError,
  TemplateExpressionEvaluatorService,
  ToolBase,
  WorkflowExecution,
} from '@loopstack/core';

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
})
@WithArguments(CreateDocumentInputSchema)
export class CreateDocument extends ToolBase {
  protected readonly logger = new Logger(CreateDocument.name);

  constructor(
    private readonly documentService: DocumentService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {
    super();
  }

  async execute(args: CreateDocumentInput, ctx: WorkflowExecution, parent: Block): Promise<ToolResult> {

    const document = parent.getDocument(args.document);
    if (!document) {
      throw new Error(`Document ${args.document} not found in parent context.`);
    }

    const config = document.config as DocumentConfigType;

    try {
      // merge the custom properties
      const mergedTemplateData = merge({}, config, args.update ?? {});

      // create the document skeleton without content property
      const documentSkeleton =
        this.templateExpressionEvaluatorService.evaluateTemplate<
          Omit<DocumentType, 'content'>
        >(
          omit(mergedTemplateData, ['content']),
          { args } as any,
          // ['document'],
          { schema: DocumentSchema },
        );

      // evaluate document content
      const parsedDocumentContent =
        this.templateExpressionEvaluatorService.evaluateTemplate<any>(
          mergedTemplateData.content,
          { args } as any,
        );

      const inputSchema = document.argsSchema;
      if (!inputSchema && parsedDocumentContent) {
        throw Error(`Document creates with content no schema defined.`);
      }

      let documentContent = undefined;
      const errorData: { error?: any } = {};

      if (inputSchema && args.validate !== 'skip') {
        const result = inputSchema.safeParse(parsedDocumentContent);
        if (!result.success) {
          if (args.validate === 'strict') {
            this.logger.error(result.error);
            throw new SchemaValidationError(
              'Document schema validation failed (strict)',
            );
          }

          errorData.error = result.error;
        }

        documentContent = result.data;
      }

      const messageId = args.id
        ? this.templateExpressionEvaluatorService.evaluateTemplate<any>(
          args.id,
          { args } as any,
          { schema: z.string() },
        )
        : undefined;

      const jsonSchema = zodToJsonSchema(inputSchema as any, {
        name: 'documentSchema',
        target: 'jsonSchema7',
      })?.definitions?.documentSchema;

      // merge document skeleton with content data
      const documentData: Partial<DocumentEntity> = {
        ...documentSkeleton,
        ...errorData,
        schema: jsonSchema,
        messageId: messageId || randomUUID(),
        content: documentContent,
        blockName: document.name,
      };

      // create the document entity
      const documentEntity = this.documentService.create(ctx, documentData);

      this.logger.debug(`Created document "${documentData.messageId}".`);

      return {
        data: documentEntity,
        effects: {
          addWorkflowDocuments: [documentEntity],
        },
      };

    } catch (e) {
      throw new ConfigTraceError(e, document);
    }
  }

}
