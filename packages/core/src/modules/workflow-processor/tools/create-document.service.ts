import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  DocumentSchema,
  PartialDocumentSchema,
  Tool,
  EvalContextInfo,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';
import { SchemaValidatorService, DocumentHelperService } from '../../common';
import { ConfigurationService } from '../../configuration';
import { DocumentType } from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';

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
    private documentHelperService: DocumentHelperService,
  ) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    info: EvalContextInfo,
  ): Promise<ToolResult> {
    const validProps = this.schema.parse(props);

    let data = workflow?.currData;

    const template = validProps.document
      ? this.loopConfigService.get<DocumentType>(
          'documents',
          validProps.document,
        )
      : undefined;

    let document = this.documentHelperService.createDocumentWithSchema(
      validProps,
      template,
      {
        context,
        data,
        info,
      },
    );

    this.actionHelperService.validateDocument(document);

    this.logger.debug(`Create document "${document.name}".`);

    return {
      data: {
        document,
      },
    };
  }
}
