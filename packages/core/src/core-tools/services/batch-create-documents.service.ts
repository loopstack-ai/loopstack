import { Injectable, Logger } from '@nestjs/common';
import { DocumentConfigType, DocumentEntity, DocumentSchema, HandlerCallResult } from '@loopstack/shared';
import { DocumentService } from '../../persistence';
import {
  BlockRegistryService, ConfigTraceError,
  SchemaValidationError,
  TemplateExpressionEvaluatorService,
  Tool,
} from '../../workflow-processor';
import { merge, omit } from 'lodash';

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
        >(
          omit(config, ['content']),
          tool,
          ['document'],
          DocumentSchema,
        );

      const inputSchema = blockRegistryItem.metadata.properties;
      if (!inputSchema && config.content) {
        throw Error(`Document creates with content no schema defined.`);
      }

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

        // merge document skeleton with content data
        const documentData: Partial<DocumentEntity> = {
          ...documentSkeleton,
          name: blockRegistryItem.name,
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

            documentData.validationError = result.error;
          }
        }

        // create the document entity
        const documentEntity = this.documentService.create(tool, documentData);

        this.logger.debug(`Created document "${documentData.name}".`);

        documents.push(documentEntity);
      }

      return documents;
    } catch (e) {
      throw new ConfigTraceError(e, blockRegistryItem.provider.instance);
    }
  }
}
