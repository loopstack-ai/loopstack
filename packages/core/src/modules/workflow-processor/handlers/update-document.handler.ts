import { Logger } from '@nestjs/common';
import {
  Handler,
  HandlerInterface,
  HandlerCallResult,
  MimeTypeSchema,
  ContextInterface,
  TransitionMetadataInterface,
  DocumentType,
  DocumentSchema,
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
    update: z
      .object({
        content: z.any(),
        tags: z.array(z.string()).optional(),
        meta: z
          .object({
            mimeType: MimeTypeSchema.optional(),
            invalidate: z.boolean().optional(),
            level: z
              .union([
                z.literal('debug'),
                z.literal('info'),
                z.literal('warning'),
                z.literal('error'),
              ])
              .optional(),
            enableAtPlaces: z.array(z.string()).optional(),
            hideAtPlaces: z.array(z.string()).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .strict();

const schema = z
  .object({
    id: z.string(),
    update: z
      .object({
        content: z.any(),
        tags: z.array(z.string()).optional(),
        meta: z
          .object({
            mimeType: z.union([MimeTypeSchema, ExpressionString]).optional(),
            invalidate: z.union([z.boolean(), ExpressionString]).optional(),
            level: z
              .union([
                ExpressionString,
                z.literal('debug'),
                z.literal('info'),
                z.literal('warning'),
                z.literal('error'),
              ])
              .optional(),
            enableAtPlaces: z.array(z.string()).optional(),
            hideAtPlaces: z.array(z.string()).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .strict();

@Handler({
  config,
  schema,
})
export class UpdateDocumentHandler implements HandlerInterface {
  private readonly logger = new Logger(UpdateDocumentHandler.name);

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
  ): Promise<HandlerCallResult> {
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
      updateSkeleton =
        this.templateExpressionEvaluatorService.parse<DocumentType>(
          updateSkeleton,
          {
            arguments: parentArguments,
            context,
            workflow,
            transition: meta,
          },
          {
            schema: DocumentSchema,
          },
        );
    }

    const content =
      typeof props.update?.content === 'object'
        ? merge({}, document.content, props.update.content)
        : props.update?.content;
    const zodSchema = this.schemaRegistry.getZodSchema(
      `${document.name}.content`,
    );
    if (!zodSchema && content) {
      throw Error(`Document updates with content no schema defined.`);
    }

    // evaluate and parse document content using document schema
    // merge with previous content for partial object updates
    const parsedDocumentContent = content
      ? this.templateExpressionEvaluatorService.parse<DocumentType>(
          content,
          {
            arguments: parentArguments,
            context,
            workflow,
            transition: meta,
          },
          {
            schema: zodSchema,
          },
        )
      : document.content;

    // merge document skeleton with content data
    const documentData = {
      ...document,
      ...updateSkeleton,
      content: parsedDocumentContent,
    };

    document = this.documentService.update(workflow, documentData);

    return {
      success: true,
      persist: true,
      workflow,
      data: document,
    };
  }
}
