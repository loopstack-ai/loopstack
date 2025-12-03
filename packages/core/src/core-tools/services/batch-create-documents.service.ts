import { Injectable, Logger } from '@nestjs/common';
import { DocumentSchema } from '@loopstack/contracts/schemas';
import type { DocumentConfigType } from '@loopstack/contracts/types';
import { DocumentEntity } from '@loopstack/common';
import {
  BlockRegistryService,
  ConfigTraceError, DocumentService,
  SchemaValidationError,
  TemplateExpressionEvaluatorService,
  Tool,
} from '../../workflow-processor';
import { merge, omit } from 'lodash';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { zodToJsonSchema } from 'zod-to-json-schema';

@Injectable()
export class BatchCreateDocumentsService {
  private readonly logger = new Logger(BatchCreateDocumentsService.name);

  constructor(
    private readonly documentService: DocumentService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly blockRegistryService: BlockRegistryService,
  ) {}

  batchCreateDocuments(
    args: {
      document: string;
      items: any[];
      validate?: string;
    },
    tool: Tool,
  ): DocumentEntity[] {
    const blockRegistryItem = this.blockRegistryService.getBlock(args.document);
    if (!blockRegistryItem) {
      throw new Error(`Document ${args.document} not found.`);
    }

    const config = blockRegistryItem.config as DocumentConfigType;

    try {
      // create the document skeleton without content property
      const documentSkeleton =
        this.templateExpressionEvaluatorService.evaluateTemplate<
          Omit<DocumentType, 'content'>
        >(omit(config, ['content']), tool, ['document'], DocumentSchema);

      const inputSchema = blockRegistryItem.metadata.properties;
      if (!inputSchema && config.content) {
        throw Error(`Document creates with content no schema defined.`);
      }

      const jsonSchema = zodToJsonSchema(inputSchema as any, {
        name: 'documentSchema',
        target: 'jsonSchema7',
      })?.definitions?.documentSchema;

      const documents: DocumentEntity[] = [];
      for (let index = 0; index < args.items.length; index++) {
        const itemDocumentData = merge({}, documentSkeleton, {
          content: args.items[index],
        });

        // evaluate document content
        const parsedDocumentContent =
          this.templateExpressionEvaluatorService.evaluateTemplate<any>(
            itemDocumentData.content,
            tool,
            ['document'],
          );

        const messageId = args.items[index].id
          ? this.templateExpressionEvaluatorService.evaluateTemplate<any>(
              args.items[index].id,
              tool,
              ['document'],
              z.string(),
            )
          : undefined;

        // merge document skeleton with content data
        const documentData: Partial<DocumentEntity> = {
          ...documentSkeleton,
          schema: jsonSchema,
          messageId: messageId || randomUUID(),
          content: parsedDocumentContent,
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

            documentData.error = result.error;
          }
        }

        // create the document entity
        const documentEntity = this.documentService.create(tool, documentData);

        this.logger.debug(`Created document "${documentData.messageId}".`);

        documents.push(documentEntity);
      }

      return documents;
    } catch (e) {
      throw new ConfigTraceError(e, blockRegistryItem.provider.instance);
    }
  }
}
