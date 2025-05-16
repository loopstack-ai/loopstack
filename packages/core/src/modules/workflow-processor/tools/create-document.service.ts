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

@Injectable()
@Tool()
export class CreateDocumentService implements ToolInterface {
  private readonly logger = new Logger(CreateDocumentService.name);
  configSchema = z.object({
    document: z.string().optional(),
    update: DocumentConfigSchema.partial().optional(),
    create: DocumentConfigSchema.optional(),
  });

  schema = z.object({
    document: z.string().optional(),
    update: PartialDocumentSchema.optional(),
    create: DocumentSchema.optional(),
  });

  constructor(
    private actionHelperService: SchemaValidatorService,
    private loopConfigService: ConfigurationService,
    private documentService: DocumentService,
    private documentHelperService: DocumentHelperService,
    private valueParserService: ValueParserService,
  ) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    workflowContext: WorkflowRunContext,
  ): Promise<ToolResult> {
    if (!workflow) {
      return {};
    }

    const validProps = this.schema.parse(props);

    let template = validProps?.document
      ? this.loopConfigService.get<DocumentType>(
          'documents',
          validProps.document,
        )
      : undefined;

    if (template) {
      const aliasDataObject =
        workflow?.aliasData && workflow.currData
          ? this.documentHelperService.prepareAliasVariables(
              workflow.aliasData,
              workflow.currData,
            )
          : {};
      template = this.valueParserService.evalObjectLeafs(template, {
        context,
        data: workflow.currData,
        tool: aliasDataObject,
        workflow: workflowContext,
      });
    }

    const documentData = merge(
      {},
      template,
      validProps?.create ?? validProps?.update,
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
      workflow,
      commitDirect: true,
      data: document,
    };
  }
}
