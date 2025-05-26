import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  Tool,
  WorkflowRunContext,
  ToolInterface,
  ToolResult,
  DocumentEntity,
  StringExpression, NonExpressionString, ObjectExpression,
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
export class BatchCreateDocumentsService implements ToolInterface {
  private readonly logger = new Logger(BatchCreateDocumentsService.name);
  configSchema = z.object({
    document: z.string(),
    namePrefix: z.union([
      StringExpression,
      NonExpressionString,
    ]).optional(),
    items: z.union([
      ObjectExpression,
      z.array(z.any())
    ]),
  });

  schema = z.object({
    document: z.string(),
    namePrefix: NonExpressionString.optional(),
    items: z.array(z.any()),
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

    let template = props?.document
      ? this.loopConfigService.get<DocumentType>(
          'documents',
        props.document,
        )
      : undefined;

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

    const documents: DocumentEntity[] = [];
    for (let index = 0; index < props.items.length; index++) {
      const documentData = merge(
        {},
        template,
        {
          name: (props.namePrefix ?? template?.name ?? 'item') + `-${index + 1}`,
          content: props.items[index]
        },
      );

      if (!documentData) {
        throw new Error(`No document data provided.`);
      }

      this.actionHelperService.validateDocument(
        documentData as Partial<DocumentEntity>,
      );

      this.logger.debug(`Create document "${documentData.name}".`);

      documents.push(this.documentService.create(
        workflow,
        context,
        workflowContext,
        documentData as Partial<DocumentEntity>,
      ));
    }

    return {
      workflow,
      commitDirect: true,
      data: documents,
    };
  }
}
