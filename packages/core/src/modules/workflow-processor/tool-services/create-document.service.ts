import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  DocumentSchema,
  PartialDocumentSchema,
  Service,
  ServiceInterface,
  ServiceCallResult,
  DocumentEntity,
  DocumentConfigSchema,
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

const schema = z
  .object({
    document: z.string().optional(),
    update: PartialDocumentSchema.optional(),
    create: DocumentSchema.optional(),
  })
  .strict();

const config = z
  .object({
    document: z.string().optional(),
    update: DocumentConfigSchema.partial().optional(),
    create: DocumentConfigSchema.optional(),
  })
  .strict();

@Injectable()
@Service({
  config,
  schema,
})
export class CreateDocumentService implements ServiceInterface {
  private readonly logger = new Logger(CreateDocumentService.name);

  constructor(
    private actionHelperService: SchemaValidatorService,
    private loopConfigService: ConfigurationService,
    private documentService: DocumentService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  getDocumentTemplate(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
  ) {
    if (!props?.document) {
      return {};
    }

    const template = this.loopConfigService.get<DocumentType>(
      'documents',
      props.document,
    );
    if (!template) {
      throw new Error(`Document template ${props.document} not found.`);
    }

    return this.templateExpressionEvaluatorService.evaluate<DocumentType>(
      template,
      {},
      context,
      workflow,
      transitionData,
    );
  }

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    meta: TransitionMetadataInterface,
  ): Promise<ServiceCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    const template: Partial<DocumentEntity> = this.getDocumentTemplate(
      props,
      workflow,
      context,
      meta,
    );

    const documentData = merge(template, props?.create ?? props?.update ?? {});

    if (!documentData) {
      throw new Error(`No document data provided.`);
    }

    this.actionHelperService.validateDocument(
      documentData as Partial<DocumentEntity>,
    );

    this.logger.debug(`Create document "${documentData.name}".`);

    const document = this.documentService.create(
      workflow,
      context,
      meta,
      documentData as Partial<DocumentEntity>,
    );

    return {
      success: true,
      workflow,
      persist: true,
      data: document,
    };
  }
}
