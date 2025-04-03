import { Injectable } from '@nestjs/common';
import {
  ContextInterface,
  DocumentSchema,
  PartialDocumentSchema, Tool, ToolApplicationInfo,
  ToolInterface, ToolResult,
  WorkflowData,
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
    inputs: z.any(z.string()).optional(),
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
    data: WorkflowData | undefined,
    info: ToolApplicationInfo,
  ): Promise<ToolResult> {
    const validProps = this.schema.parse(props);

    // select imports as inputs
    let inputs = pick(data?.imports ?? {}, props.inputs);

    const template = validProps.template
      ? this.loopConfigService.get<DocumentType>(
          'documents',
          validProps.template,
        )
      : undefined;

    console.log('create template', template)

    let document = this.documentHelperService.createDocumentWithSchema(
      validProps,
      template,
      {
        context,
        inputs,
        info,
      },
    );

    this.actionHelperService.validateDocument(document);

    console.log(document)

    return {
      documents: [document],
    };
  }
}
