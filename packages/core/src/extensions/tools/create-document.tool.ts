import { Injectable } from '@nestjs/common';
import { Tool } from '../../processor';
import { DocumentSchema, PartialDocumentSchema } from '@loopstack/shared';
import { ActionHelperService, DocumentHelperService } from '../../common';
import { DocumentCreateInterface } from '../../persistence/interfaces/document-create.interface';
import { LoopConfigService } from '../../configuration';
import { DocumentType } from '@loopstack/shared';
import { ToolApplicationInfo, ToolInterface, ToolResult } from '../../processor/interfaces/tool.interface';
import { WorkflowEntity } from '../../persistence/entities';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { WorkflowData } from '../../processor/interfaces/workflow-data.interface';
import { pick } from 'lodash';
import { z } from 'zod';

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
    private loopConfigService: LoopConfigService,
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

    const template = validProps.template ? this.loopConfigService.get<DocumentType>('documents', validProps.template) : undefined;

    let document = this.documentHelperService.createDocumentWithSchema(validProps, template, {
      context,
      inputs,
      info,
    });

    this.actionHelperService.validateDocument(document);

    document = this.actionHelperService.createDocument(document as DocumentCreateInterface, info);

    return {
      documents: [document],
    };
  }
}
