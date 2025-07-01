import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  Service,
  ServiceInterface,
  ServiceCallResult,
  DocumentEntity,
  ExpressionString,
  TransitionMetadataInterface,
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
          schemaPath: `config.documents[]`,
        },
      );

    // get the document content schema registry key
    const documentContentSchemaPath = undefined === props.document ? null : `custom.documents.content.${props.document}`;

    const documents: DocumentEntity[] = [];
    for (let index = 0; index < props.items.length; index++) {
      const itemDocumentData = merge({}, documentSkeleton, props.items[index]);

      // evaluate and parse document content using document schema
      const parsedDocumentContent = this.templateExpressionEvaluatorService.parse<DocumentType>(
        itemDocumentData.content,
        {
          arguments: parentArguments,
          context,
          workflow,
          transition: transitionData
        },
        {
          schemaPath: documentContentSchemaPath,
        },
      );

      // merge document skeleton with content data
      const documentData = {
        ...itemDocumentData,
        content: parsedDocumentContent,
      }

      // validate the (complete) content using document schema
      if (documentContentSchemaPath) {
        const zodSchema = this.schemaRegistry.getZodSchema(documentContentSchemaPath);
        zodSchema!.parse(documentData.content);
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
