import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../decorators/state-machine-observer.decorator';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../interfaces/state-machine-action.interface';
import { TransitionResultInterface } from '../interfaces/transition-result.interface';
import { TransitionManagerService } from '../services/transition-manager.service';
import {DocumentCreateDto} from "../../persistence/dtos/document-create.dto";
import {CreateDocumentPropsConfigType, CreateDocumentPropsSchema} from "@loopstack/shared";
const crypto = require('crypto');

@Injectable()
@StateMachineAction()
export class CreateDocumentAction implements StateMachineActionInterface {
  constructor(private transitionManagerService: TransitionManagerService) {}

  generateUUID() {
    return crypto.randomUUID();
  }

  async execute(
    payload: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(payload);

    console.log(payload.props)
    const props: CreateDocumentPropsConfigType = CreateDocumentPropsSchema.parse(payload.props);

    manager.createDocument(new DocumentCreateDto({
      name: props.name ?? this.generateUUID(),
      type: props.type,
      contents: props.contents,
      meta: {
        ...(props.meta ?? {}),
      }
    }))

    return manager.getResult();
  }
}
