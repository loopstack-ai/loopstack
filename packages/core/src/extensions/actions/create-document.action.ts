import { Injectable } from '@nestjs/common';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../../processor';
import { TransitionResultInterface } from '../../processor';
import { DocumentSchema, PartialDocumentSchema } from '@loopstack/shared';
import { z } from 'zod';
import { StateMachineAction } from '../../processor';
import { ActionHelperService, DocumentHelperService } from '../../common';
import { DocumentCreateInterface } from '../../persistence/interfaces/document-create.interface';
import { LoopConfigService } from '../../configuration';
import { DocumentType } from '@loopstack/shared';
import {pick} from 'lodash';

@Injectable()
@StateMachineAction()
export class CreateDocumentAction implements StateMachineActionInterface {

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

  async execute(
    payload: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.actionHelperService.setContext(payload);
    const validProps = this.schema.parse(payload.props);

    // select imports as inputs
    let inputs = pick(payload.data?.imports ?? {}, payload.props.inputs);

    const template = validProps.template ? this.loopConfigService.get<DocumentType>('documents', validProps.template) : undefined;

    const document = this.documentHelperService.createDocumentWithSchema(validProps, template, {
      context: payload,
      inputs,
    });

    manager.addDocument(document as DocumentCreateInterface);

    return manager.getResult();
  }
}
