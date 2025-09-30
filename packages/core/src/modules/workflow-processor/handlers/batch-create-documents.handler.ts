import { Logger } from '@nestjs/common';
import {
  ContextInterface,
  Handler,
  HandlerInterface,
  HandlerCallResult,
  DocumentEntity,
  ExpressionString,
  TransitionMetadataInterface,
  DocumentSchema,
} from '@loopstack/shared';
import { DocumentType } from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';
import { merge, omit } from 'lodash';
import { TemplateExpressionEvaluatorService } from '../services';
import { ConfigTraceError } from '../../configuration';

const config = z
  .object({
    document: z.string(),
    name: z.string().optional(),
    items: z.union([ExpressionString, z.array(z.any())]),
  })
  .strict();

const schema = z
  .object({
    document: z.string(),
    name: z.string().optional(),
    items: z.array(z.any()),
  })
  .strict();

@Handler({
  config,
  schema,
})
export class BatchCreateDocumentsHandler implements HandlerInterface {
  private readonly logger = new Logger(BatchCreateDocumentsHandler.name);

  constructor(
    private documentService: DocumentService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
    parentArguments: any,
  ): Promise<HandlerCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    // get the document template
    const template = {} as any;
    // this.loopConfigService.resolveConfig<DocumentType>(
    //   'documents',
    //   props.document,
    //   context.includes,
    // );

    try {
      const documentSkeleton =
        this.templateExpressionEvaluatorService.parse<DocumentType>(
          omit(template.config, ['content']),
          {
            arguments: parentArguments,
            context,
            workflow,
            transition: transitionData,
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
      for (let index = 0; index < props.items.length; index++) {

        const itemDocumentData = merge({}, documentSkeleton, { content: props.items[index] });
        if (!zodSchema && itemDocumentData.content) {
          throw Error(`Document creates with content no schema defined.`);
        }

        // evaluate and parse document content using document schema
        const parsedDocumentContent = itemDocumentData.content
          ? this.templateExpressionEvaluatorService.parse<DocumentType>(
            itemDocumentData.content,
            {
              arguments: parentArguments,
              context,
              workflow,
              transition: transitionData,
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
            workflow,
            context,
            transitionData,
            documentData as Partial<DocumentEntity>,
          ),
        );

        // this.logger.debug(`Created document "${documentData.name}".`);
      }

      return {
        success: true,
        persist: true,
        workflow,
        data: documents,
      };
    } catch (e) {
      throw new ConfigTraceError(e, template);
    }
  }
}
