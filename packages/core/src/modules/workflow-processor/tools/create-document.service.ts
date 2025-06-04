import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  DocumentSchema,
  PartialDocumentSchema,
  Tool,
  WorkflowRunContext,
  ToolInterface,
  ToolResult,
  DocumentEntity,
  DocumentConfigSchema,
} from '@loopstack/shared';
import {
  SchemaValidatorService,
  DocumentHelperService,
  ValueParserService,
} from '../../common';
import { ConfigurationService } from '../../configuration';
import { DocumentType } from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';
import { merge } from 'lodash';

const schema = z.object({
  document: z.string().optional(),
  update: PartialDocumentSchema.optional(),
  create: DocumentSchema.optional(),
}).strict();

const config = z.object({
    document: z.string().optional(),
    update: DocumentConfigSchema.partial().optional(),
    create: DocumentConfigSchema.optional(),
  }).strict();

@Injectable()
@Tool({
  name: 'createDocument',
  description: 'Create a document',
  config,
  schema,
})
export class CreateDocumentService implements ToolInterface {
  private readonly logger = new Logger(CreateDocumentService.name);

  constructor(
    private actionHelperService: SchemaValidatorService,
    private loopConfigService: ConfigurationService,
    private documentService: DocumentService,
    private documentHelperService: DocumentHelperService,
    private valueParserService: ValueParserService,
  ) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    workflowContext: WorkflowRunContext,
  ): Promise<ToolResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    let template = props?.document
      ? this.loopConfigService.get<DocumentType>(
          'documents',
          props.document,
        )
      : undefined;

    if (template) {
      const aliasVariables =
        workflow?.aliasData && workflow.currData
          ? this.documentHelperService.prepareAliasVariables(
              workflow.aliasData,
              workflow.currData,
            )
          : {};
      template = this.valueParserService.evalObjectLeafs(template, {
        ...aliasVariables,
        context,
        data: workflow.currData,
        workflow: workflowContext,
      });
    }

    const documentData = merge(
      {},
      template,
      props?.create ?? props?.update ?? {},
    );

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
      workflowContext,
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
