import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  Service,
  ServiceInterface,
  ServiceCallResult,
  DocumentEntity,
  ExpressionString,
  NonExpressionString,
  TransitionMetadataInterface,
} from '@loopstack/shared';
import { SchemaValidatorService } from '../../common';
import { ConfigurationService } from '../../configuration';
import { DocumentType } from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';
import { merge } from 'lodash';
import { TemplateExpressionEvaluatorService } from '../services';

const config = z
  .object({
    document: z.string(),
    name: z.union([ExpressionString, NonExpressionString]).optional(),
    addSuffix: z.union([ExpressionString, z.boolean()]).optional(),
    items: z.union([ExpressionString, z.array(z.any())]),
  })
  .strict();

const schema = z
  .object({
    document: z.string(),
    name: NonExpressionString.optional(),
    addSuffix: z.boolean().optional(),
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
    private actionHelperService: SchemaValidatorService,
    private loopConfigService: ConfigurationService,
    private documentService: DocumentService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
  ): Promise<ServiceCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    const template = this.loopConfigService.get<DocumentType>(
      'documents',
      props.document,
    );
    if (!template) {
      throw new Error(`Document template ${props.document} not found.`);
    }

    const evaluatedTemplate =
      this.templateExpressionEvaluatorService.evaluate<DocumentType>(
        template,
        {},
        context,
        workflow,
        transitionData,
      );

    const documents: DocumentEntity[] = [];
    for (let index = 0; index < props.items.length; index++) {
      const documentData = merge({}, evaluatedTemplate, props.items[index]);
      if (!documentData) {
        throw new Error(`No document data provided.`);
      }

      if (props.addSuffix) {
        documentData.name += `-${index + 1}`;
      }

      this.actionHelperService.validateDocument(
        documentData as Partial<DocumentEntity>,
      );

      this.logger.debug(`Create document "${documentData.name}".`);

      documents.push(
        this.documentService.create(
          workflow,
          context,
          transitionData,
          documentData as Partial<DocumentEntity>,
        ),
      );
    }

    return {
      success: true,
      workflow,
      persist: true,
      data: documents,
    };
  }
}
