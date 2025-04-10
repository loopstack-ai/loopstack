import { Injectable } from '@nestjs/common';
import {
  ContextInterface,
  DocumentSchema,
  PartialDocumentSchema,
  Tool,
  ToolApplicationInfo,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';
import { ActionHelperService, DocumentHelperService } from '../../common';
import { ConfigurationService } from '../../configuration';
import { DocumentType } from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { StateMachineInfoDto } from '@loopstack/shared/dist/dto/state-machine-info.dto';

@Injectable()
@Tool()
export class CreateDocumentTool implements ToolInterface {
  schema = z.object({
    document: z.string().optional(),
    update: PartialDocumentSchema.optional(),
    create: DocumentSchema.optional(),
  });

  constructor(
    private actionHelperService: ActionHelperService,
    private loopConfigService: ConfigurationService,
    private documentHelperService: DocumentHelperService,
  ) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    info: StateMachineInfoDto,
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

    return {
      data: {
        documents: [document],
      },
    };
  }
}
