import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  Service,
  ServiceInterface,
  ServiceCallResult,
  DocumentEntity,
  TransitionMetadataInterface, ExpressionString, MimeTypeSchema,
} from '@loopstack/shared';
import { ConfigurationService, SchemaRegistry } from '../../configuration';
import { DocumentType } from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';
import { merge, omit } from 'lodash';
import { TemplateExpressionEvaluatorService } from '../services';

const schema = z
  .object({
    document: z.string(),
    update: z.object({
      content: z.any(),
      tags: z.array(
        z.string()
      ).optional(),
      meta: z.object({
        mimeType: MimeTypeSchema.optional(),
        invalidate: z.boolean().optional(),
        level: z.union([
          z.literal('debug'),
          z.literal('info'),
          z.literal('warning'),
          z.literal('error'),
        ]).optional(),
        enableAtPlaces: z.array(z.string()).optional(),
        hideAtPlaces: z.array(z.string()).optional(),
      }).optional(),
    }).optional(),
  })
  .strict();

const config = z
  .object({
    document: z.string(),
    update: z.object({
      content: z.any(),
      tags: z.array(
        z.string()
      ).optional(),
      meta: z.object({
        mimeType: z.union([
          MimeTypeSchema,
          ExpressionString,
        ]).optional(),
        invalidate: z.union([
          z.boolean(),
          ExpressionString,
        ]).optional(),
        level: z.union([
          ExpressionString,
          z.literal('debug'),
          z.literal('info'),
          z.literal('warning'),
          z.literal('error'),
        ]).optional(),
        enableAtPlaces: z.array(z.string()).optional(),
        hideAtPlaces: z.array(z.string()).optional(),
      }).optional(),
    }).optional(),
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
    private loopConfigService: ConfigurationService,
    private documentService: DocumentService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private schemaRegistry: SchemaRegistry,
  ) {}

  getDocumentTemplate(props: z.infer<typeof schema>): DocumentType {
    const template = this.loopConfigService.get<DocumentType>(
      'documents',
      props.document,
    );

    if (!template) {
      throw new Error(`Document template ${props.document} not found.`);
    }

    return template;
  }

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    meta: TransitionMetadataInterface,
    parentArguments: any,
  ): Promise<ServiceCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    // get the document template
    const template: DocumentType = this.getDocumentTemplate(
      props,
    );

    // merge the custom properties
    const mergedTemplateData = merge(template, props.update ?? {});

    // create the document skeleton without content property
    const documentSkeleton = this.templateExpressionEvaluatorService.parse<DocumentType>(
      omit(mergedTemplateData, ['content']),
      parentArguments,
      context,
      workflow,
      meta,
    );

    // get the document content schema registry key
    const documentContentSchemaPath = undefined === props.document ? null : `documents.content.${props.document}`;

    // evaluate and parse document content using document schema
    const parsedDocumentContent = this.templateExpressionEvaluatorService.parse<DocumentType>(
      mergedTemplateData.content,
      parentArguments,
      context,
      workflow,
      meta,
      documentContentSchemaPath,
    );

    // merge document skeleton with content data
    const documentData = {
      ...documentSkeleton,
      content: parsedDocumentContent,
    }

    // validate the (complete) content using document schema
    if (documentContentSchemaPath) {
      const zodSchema = this.schemaRegistry.getZodSchema(documentContentSchemaPath);
      zodSchema!.parse(documentData.content);
    }

    // create the document entity
    const document = this.documentService.create(
      workflow,
      context,
      meta,
      documentData as Partial<DocumentEntity>,
    );

    this.logger.debug(`Created document "${documentData.name}".`);

    return {
      success: true,
      workflow,
      persist: true,
      data: document,
    };
  }
}
