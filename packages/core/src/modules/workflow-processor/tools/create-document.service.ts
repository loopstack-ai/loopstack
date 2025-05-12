import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  DocumentSchema,
  PartialDocumentSchema,
  Tool,
  EvalContextInfo,
  ToolInterface,
  ToolResult, DocumentEntity,
} from '@loopstack/shared';
import { SchemaValidatorService, DocumentHelperService } from '../../common';
import { ConfigurationService } from '../../configuration';
import { DocumentType } from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';

@Injectable()
@Tool()
export class CreateDocumentService implements ToolInterface {
  private readonly logger = new Logger(CreateDocumentService.name);
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
  ) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    info: EvalContextInfo,
  ): Promise<ToolResult> {
    if (!workflow) {
      return {}
    }

    const validProps = this.schema.parse(props);

    let data = workflow.currData;

    const template = validProps.document
      ? this.loopConfigService.get<DocumentType>(
          'documents',
          validProps.document,
        )
      : undefined;

    let documentPrototype = this.documentHelperService.createDocumentWithSchema(
      validProps,
      template,
      {
        context,
        data,
        info,
      },
    ) as Partial<DocumentEntity>;
    this.actionHelperService.validateDocument(documentPrototype);

    this.logger.debug(`Create document "${documentPrototype.name}".`);

    this.documentService.create(workflow, context, info, documentPrototype);

    return {
      commitDirect: true,
    }
  }
}
