import {
  Block,
  ExecutionContext,
  HandlerCallResult,
  DocumentType,
  DocumentSchema,
  DocumentEntity,
} from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { DocumentService } from '../../../persistence';
import { TemplateExpressionEvaluatorService } from '../../services';
import { isEmpty, merge, omit } from 'lodash';

const UpdateDocumentInputSchema = z.object({
  id: z.string(),
  update: z
    .object({
      content: z.any(),
      tags: z.array(z.string()).optional(),
      meta: z
        .object({
          mimeType: z.any().optional(),
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
});

const UpdateDocumentConfigSchema = z.object({
  id: z.string(),
  update: z
    .object({
      content: z.any(),
      tags: z.array(z.string()).optional(),
      meta: z
        .object({
          mimeType: z.any().optional(),
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
});

type UpdateDocumentInput = z.infer<typeof UpdateDocumentInputSchema>;

@Block({
  config: {
    type: 'tool',
    description: 'Update document content and metadata.',
  },
  inputSchema: UpdateDocumentInputSchema,
  configSchema: UpdateDocumentConfigSchema,
})
export class UpdateDocument extends Tool {
  protected readonly logger = new Logger(UpdateDocument.name);

  constructor(
    private readonly documentService: DocumentService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(
    ctx: ExecutionContext<UpdateDocumentInput>,
  ): Promise<HandlerCallResult> {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }

    let document = ctx.workflow.documents.find(
      (item) => item.id === ctx.args.id,
    );
    if (!document) {
      throw new Error(`Document with ID ${ctx.args.id} not found.`);
    }

    this.logger.debug(`Update document "${document.name}".`);

    // create the document skeleton without content property
    let updateSkeleton: any = omit(ctx.args.update ?? {}, ['content']);
    if (!isEmpty(updateSkeleton)) {
      updateSkeleton =
        this.templateExpressionEvaluatorService.parse<DocumentType>(
          updateSkeleton,
          {
            arguments: ctx.parentArgs,
            context: ctx.context,
            workflow: ctx.workflow,
            transition: ctx.transitionData,
          },
          {
            schema: DocumentSchema,
          },
        );
    }

    const content =
      typeof ctx.args.update?.content === 'object'
        ? merge({}, document.content, ctx.args.update.content)
        : ctx.args.update?.content;
    const zodSchema = z.any();
    // todo
    // this.schemaRegistry.getZodSchema(
    //   `${document.configKey}.content`,
    // );
    if (!zodSchema && content) {
      throw Error(`Document updates with content no schema defined.`);
    }

    // evaluate and parse document content using document schema
    // merge with previous content for partial object updates
    const parsedDocumentContent = content
      ? this.templateExpressionEvaluatorService.parse<DocumentType>(
          content,
          {
            arguments: ctx.parentArgs,
            context: ctx.context,
            workflow: ctx.workflow,
            transition: ctx.transitionData,
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

    document = this.documentService.update(
      ctx.workflow,
      documentData as DocumentEntity,
    );

    return {
      success: true,
      persist: true,
      workflow: ctx.workflow,
      data: document,
    };
  }
}
