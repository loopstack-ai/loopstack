import { Logger } from '@nestjs/common';
import {
  ContextInterface,
  Handler,
  HandlerInterface,
  HandlerCallResult,
  DocumentEntity,
  TransitionMetadataInterface,
  ExpressionString,
  MimeTypeSchema,
  DocumentSchema,
  ToolConfigType,
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

const config = z
  .object({
    document: z.string(),
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
export class CreateDocumentHandler implements HandlerInterface {
  private readonly logger = new Logger(CreateDocumentHandler.name);

  constructor(
    private loopConfigService: ConfigurationService,
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

    // get the document template
    const template = this.loopConfigService.resolveConfig<ToolConfigType>(
      'documents',
      props.document,
      context.includes,
    );

    // merge the custom properties
    const mergedTemplateData = merge({}, template.config, props.update ?? {});

    // create the document skeleton without content property
    const documentSkeleton =
      this.templateExpressionEvaluatorService.parse<DocumentType>(
        omit(mergedTemplateData, ['content']),
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

    const zodSchema = this.schemaRegistry.getZodSchema(
      `${template.key}.content`,
    );
    if (!zodSchema && mergedTemplateData.content) {
      throw Error(`Document creates with content no schema defined.`);
    }

    // evaluate and parse document content using document schema
    const parsedDocumentContent = mergedTemplateData.content
      ? this.templateExpressionEvaluatorService.parse<DocumentType>(
          mergedTemplateData.content,
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
      : null;

    // merge document skeleton with content data
    const documentData = {
      ...documentSkeleton,
      content: parsedDocumentContent,
      configKey: template.key,
    };

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
      persist: true,
      workflow,
      data: document,
    };
  }
}
