import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  Service,
  ServiceInterface,
  ServiceCallResult,
  DocumentEntity,
  ExpressionString,
  TransitionMetadataInterface, DocumentSchema,
} from '@loopstack/shared';
import { ConfigurationService, SchemaRegistry } from '../../configuration';
import { DocumentType } from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';
import { merge, omit } from 'lodash';
import { TemplateExpressionEvaluatorService } from '../services';

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

@Injectable()
@Service({
  config,
  schema,
})
export class BatchCreateDocumentsService implements ServiceInterface {
  private readonly logger = new Logger(BatchCreateDocumentsService.name);

  constructor(
    private loopConfigService: ConfigurationService,
    private documentService: DocumentService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private schemaRegistry: SchemaRegistry,
  ) {}

  getDocumentTemplate(document: string): DocumentType {
    const template = this.loopConfigService.get<DocumentType>(
      'documents',
      document,
    );

    if (!template) {
      throw new Error(`Document template ${document} not found.`);
    }

    return template;
  }

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
    parentArguments: any,
  ): Promise<ServiceCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    // get the document template
    const template: DocumentType = this.getDocumentTemplate(
      props.document,
    );

    const documentSkeleton =
      this.templateExpressionEvaluatorService.parse<DocumentType>(
        omit(template, ['content']),
        {
          arguments: parentArguments,
          context,
          workflow,
          transition: transitionData
        },
        {
          schema: DocumentSchema,
        },
      );

    const zodSchema = this.schemaRegistry.getDocumentContentSchema(props.document);

    const documents: DocumentEntity[] = [];
    for (let index = 0; index < props.items.length; index++) {
      const itemDocumentData = merge({}, documentSkeleton, props.items[index]);
      if (!zodSchema && itemDocumentData.content) {
        throw Error(`Document creates with content no schema defined.`);
      }

      // evaluate and parse document content using document schema
      const parsedDocumentContent = itemDocumentData.content ? this.templateExpressionEvaluatorService.parse<DocumentType>(
        itemDocumentData.content,
        {
          arguments: parentArguments,
          context,
          workflow,
          transition: transitionData
        },
        {
          schema: zodSchema,
        },
      ) : null;

      // merge document skeleton with content data
      const documentData = {
        ...itemDocumentData,
        content: parsedDocumentContent,
      }

      documents.push(
        this.documentService.create(
          workflow,
          context,
          transitionData,
          documentData as Partial<DocumentEntity>,
        )
      );

      this.logger.debug(`Created document "${documentData.name}".`);
    }

    return {
      success: true,
      persist: true,
      workflow,
      data: documents,
    };
  }
}
