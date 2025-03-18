import { Injectable } from '@nestjs/common';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../../processor';
import { TransitionResultInterface } from '../../processor';
import { DocumentType, DocumentSchema } from '@loopstack/shared';
import { z } from 'zod';
import { StateMachineAction } from '../../processor';
import { ActionHelperService } from '../../common';
import { FunctionCallService } from '../../common';
import { DocumentCreateInterface } from '../../persistence/interfaces/document-create.interface';

@Injectable()
@StateMachineAction()
export class CreateDocumentAction implements StateMachineActionInterface {

  schema = z.object({
    inputs: z.any(z.string()).optional(),
    output: DocumentSchema
  });

  constructor(
    private actionHelperService: ActionHelperService,
    private transitionManagerService: ActionHelperService,
    private functionCallService: FunctionCallService,
  ) {}

  evalObjectLeafs<T>(obj: T, variables: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return this.functionCallService.runEval(obj, variables) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.evalObjectLeafs(item, variables)) as unknown as T;
    }

    const result = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.evalObjectLeafs(obj[key], variables);
      }
    }

    return result;
  }

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


    console.log('validProps.inputs', inputs)
    const updatedDocument = this.evalObjectLeafs(validProps.output, {
      context,
      inputs,
    })

    manager.addDocument(updatedDocument as DocumentCreateInterface);

    return manager.getResult();
  }
}
