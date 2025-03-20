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
import { DocumentCollectionService } from '../../configuration';

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
    private transitionManagerService: ActionHelperService,
    private documentCollectionService: DocumentCollectionService,
    private documentHelperService: DocumentHelperService,
  ) {}

  async execute(
    context: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(context);
    const validProps = this.schema.parse(context.props);

    // merge inputs in single object
    let inputs = this.actionHelperService.mergeInputs(
      context.props.inputs,
      context.workflowContext.imports
    );

    const template = validProps.template ? this.documentCollectionService.getByName(validProps.template) : undefined;

    const document = this.documentHelperService.createDocumentWithSchema(validProps, template, {
      context,
      inputs,
    });

    manager.addDocument(document as DocumentCreateInterface);

    return manager.getResult();
  }
}
