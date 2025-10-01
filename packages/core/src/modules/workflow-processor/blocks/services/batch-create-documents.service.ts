import { Injectable, Logger } from '@nestjs/common';
import {
  HandlerCallResult,
  ExecutionContext,
  DocumentEntity,
  DocumentSchema,
  DocumentType,
} from '@loopstack/shared';
import { DocumentService } from '../../../persistence';
import { TemplateExpressionEvaluatorService } from '../../services';
import { ConfigTraceError } from '../../../configuration';
import { merge, omit } from 'lodash';
import { z } from 'zod';

@Injectable()
export class BatchCreateDocumentsService {
  private readonly logger = new Logger(BatchCreateDocumentsService.name);

  constructor(
    private readonly documentService: DocumentService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  batchCreateDocuments(
    ctx: ExecutionContext<{
      document: string;
      items: any[];
    }>,
  ): HandlerCallResult {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }

    // get the document template
    const template = {} as any;
    // this.loopConfigService.resolveConfig<DocumentType>(
    //   'documents',
    //   ctx.args.document,
    //   ctx.context.includes,
    // );

    try {
      const documentSkeleton =
        this.templateExpressionEvaluatorService.parse<DocumentType>(
          omit(template.config, ['content']),
          {
            arguments: ctx.args,
            context: ctx.context,
            workflow: ctx.workflow,
            transition: ctx.transitionData,
          },
          {
            schema: DocumentSchema,
          },
        );

      const zodSchema = z.any();
      // todo
      // this.schemaRegistry.getZodSchema(
      //   `${template.key}.content`,
      // );

      const documents: DocumentEntity[] = [];
      for (let index = 0; index < ctx.args.items.length; index++) {
        const itemDocumentData = merge({}, documentSkeleton, {
          content: ctx.args.items[index],
        });
        if (!zodSchema && itemDocumentData.content) {
          throw Error(`Document creates with content no schema defined.`);
        }

        // evaluate and parse document content using document schema
        const parsedDocumentContent = itemDocumentData.content
          ? this.templateExpressionEvaluatorService.parse<DocumentType>(
              itemDocumentData.content,
              {
                arguments: ctx.args,
                context: ctx.context,
                workflow: ctx.workflow,
                transition: ctx.transitionData,
              },
              {
                schema: zodSchema,
              },
            )
          : null;

        // merge document skeleton with content data
        const documentData = {
          ...itemDocumentData,
          content: parsedDocumentContent,
          configKey: template.key,
        };

        documents.push(
          this.documentService.create(
            ctx.workflow,
            ctx.context,
            ctx.transitionData,
            documentData as Partial<DocumentEntity>,
          ),
        );

        // this.logger.debug(`Created document "${documentData.name}".`);
      }

      return {
        success: true,
        persist: true,
        workflow: ctx.workflow,
        data: documents,
      };
    } catch (e) {
      throw new ConfigTraceError(e as Error, template);
    }
  }
}
