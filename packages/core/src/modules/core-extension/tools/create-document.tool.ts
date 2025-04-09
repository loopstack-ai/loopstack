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
import { pick } from 'lodash';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@Tool()
export class CreateDocumentTool implements ToolInterface {
  schema = z.object({
    template: z.string().optional(),
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
    info: ToolApplicationInfo,
  ): Promise<ToolResult> {
    const validProps = this.schema.parse(props);

    // imports
    let imports = workflow?.currData?.imports;

    const template = validProps.template
      ? this.loopConfigService.get<DocumentType>(
          'documents',
          validProps.template,
        )
      : undefined;

    let document = this.documentHelperService.createDocumentWithSchema(
      validProps,
      template,
      {
        context,
        imports,
        info,
      },
    );

    this.actionHelperService.validateDocument(document);

    return {
      documents: [document],
    };
  }
}
