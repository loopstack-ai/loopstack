import { Inject, Logger } from '@nestjs/common';
import { merge, omit } from 'lodash';
import { randomUUID } from 'node:crypto';
import { ZodError, ZodSchema, toJSONSchema, z } from 'zod';
import {
  BaseTool,
  DocumentEntity,
  DocumentInterface,
  Input,
  Tool,
  ToolResult,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockDocument,
} from '@loopstack/common';
import { DocumentSchema } from '@loopstack/contracts/schemas';
import { DocumentConfigType, DocumentType } from '@loopstack/contracts/types';
import { ConfigTraceError, SchemaValidationError } from '../common';
import { DocumentService } from '../persistence';

interface ContentValidationResult {
  content: unknown;
  error?: ZodError;
}

type ValidateMode = 'strict' | 'safe' | 'skip';

export const CreateDocumentInputSchema = z
  .object({
    id: z.string().optional(),
    document: z.string(),
    validate: z.union([z.literal('strict'), z.literal('safe'), z.literal('skip')]).default('strict'),
    update: DocumentSchema.optional(),
  })
  .strict();

export type CreateDocumentInput = z.infer<typeof CreateDocumentInputSchema>;

@Tool({
  config: {
    description: 'Create a document.',
  },
})
export class CreateDocument extends BaseTool {
  protected readonly logger = new Logger(CreateDocument.name);

  @Input({ schema: CreateDocumentInputSchema })
  private readonly args: CreateDocumentInput;

  @Inject()
  private readonly documentService: DocumentService;

  run(args: CreateDocumentInput): Promise<ToolResult> {
    const document = getBlockDocument<DocumentInterface>(this.parent, args.document);
    if (!document) {
      return Promise.reject(new Error(`Document "${args.document}" not found in parent context.`));
    }

    const config = getBlockConfig<DocumentConfigType>(document);
    if (!config) {
      throw new Error(`Block ${document.constructor.name} is missing @BlockConfig decorator`);
    }

    try {
      const mergedTemplateData = this.mergeTemplateData(config, args.update);

      const documentSkeleton = omit(mergedTemplateData, ['content']) as Omit<DocumentType, 'content'>;

      const validationResult = this.validateContent(
        getBlockArgsSchema(document),
        mergedTemplateData.content,
        args.validate,
      );

      const messageId = args.id ?? randomUUID();

      const jsonSchema = this.createJsonSchema(getBlockArgsSchema(document));

      const documentEntity = this.createDocumentEntity({
        skeleton: documentSkeleton,
        content: validationResult.content,
        error: validationResult.error,
        schema: jsonSchema,
        messageId,
        blockName: document.constructor.name,
        className: document.constructor.name,
      });

      this.logger.debug(`Created document "${messageId}".`);

      return Promise.resolve(this.buildResult(documentEntity));
    } catch (e: unknown) {
      throw new ConfigTraceError(e instanceof Error ? e : new Error(String(e)), document);
    }
  }

  private mergeTemplateData(config: DocumentConfigType, update?: Partial<DocumentConfigType>): DocumentConfigType {
    return merge({}, config, update ?? {});
  }

  private validateContent(
    schema: ZodSchema | undefined,
    content: unknown,
    mode: ValidateMode,
  ): ContentValidationResult {
    if (!schema && content !== undefined) {
      throw new Error('Document was created with content but no schema is defined.');
    }

    if (!schema || mode === 'skip') {
      return { content };
    }

    const result = schema.safeParse(content);

    if (!result.success) {
      if (mode === 'strict') {
        this.logger.error(result.error);
        throw new SchemaValidationError('Document schema validation failed (strict mode)');
      }

      return {
        content: result.data,
        error: result.error,
      };
    }

    return { content: result.data };
  }

  private createJsonSchema(schema: ZodSchema | undefined): unknown {
    if (!schema) {
      return undefined;
    }

    return toJSONSchema(schema);
  }

  private createDocumentEntity(params: {
    skeleton: Omit<DocumentType, 'content'>;
    content: unknown;
    error?: ZodError;
    schema: unknown;
    messageId: string;
    blockName: string;
    className: string;
  }): DocumentEntity {
    const documentData: Partial<DocumentEntity> = {
      ...params.skeleton,
      content: params.content,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      schema: params.schema as any,
      messageId: params.messageId,
      blockName: params.blockName,
      className: params.className,
    };

    if (params.error) {
      documentData.error = params.error;
    }

    return this.documentService.create(this.context, this.runtime, documentData);
  }

  private buildResult(documentEntity: DocumentEntity): ToolResult {
    return {
      data: documentEntity,
      effects: [
        {
          addWorkflowDocuments: [documentEntity],
        },
      ],
    };
  }
}
