import { Injectable, Logger } from '@nestjs/common';
import {
  Service,
  ServiceInterface,
  ServiceCallResult, MimeTypeSchema, ContextInterface, TransitionMetadataInterface, DocumentType,
} from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';
import { isEmpty, merge, omit } from 'lodash';
import { ExpressionString } from '@loopstack/shared/dist/schemas/expression-type.schema';
import { TemplateExpressionEvaluatorService } from '../services';
import { SchemaRegistry } from '../../configuration';

const config = z
  .object({
    id: ExpressionString,
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

const schema = z
  .object({
    id: z.string(),
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
export class UpdateDocumentService implements ServiceInterface {
  private readonly logger = new Logger(UpdateDocumentService.name);

  constructor(
    private documentService: DocumentService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private schemaRegistry: SchemaRegistry,
  ) {}

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

    let document = workflow.documents.find((item) => item.id === props.id);
    if (!document) {
      throw new Error(`Document with ID ${props.id} not found.`);
    }

    this.logger.debug(`Update document "${document.name}".`);

    // create the document skeleton without content property
    let updateSkeleton: any = omit(props.update ?? {}, ['content']);
    if (!isEmpty(updateSkeleton)) {
      updateSkeleton = this.templateExpressionEvaluatorService.parse<DocumentType>(
        updateSkeleton,
        {
          arguments: parentArguments,
          context,
          workflow,
          transition: meta
        },
        {
          schemaPath: `config.documents[]`,
        },
      );
    }

    // get the document content schema registry key
    const documentContentSchemaPath = `custom.documents.content.${document.name}`;

    // evaluate and parse document content using document schema
    const parsedDocumentContent = undefined !== props.update?.content ? this.templateExpressionEvaluatorService.parse<DocumentType>(
      props.update.content,
      {
        arguments: parentArguments,
        context,
        workflow,
        transition: meta
      },
      {
        schemaPath: documentContentSchemaPath,
      },
    ) : document.content;

    // merge document skeleton with content data
    const documentData = {
      ...document,
      ...updateSkeleton,
      content: parsedDocumentContent,
    }

    // validate the (complete) content using document schema
    if (documentContentSchemaPath) {
      const zodSchema = this.schemaRegistry.getZodSchema(documentContentSchemaPath);
      zodSchema!.parse(documentData.content);
    }

    document = this.documentService.update(
      workflow,
      documentData,
    );

    return {
      success: true,
      persist: true,
      workflow,
      data: document,
    };
  }
}
