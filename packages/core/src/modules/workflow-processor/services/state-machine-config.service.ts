import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import {
  StateMachineHandlerType,
  WorkflowTransitionType,
  StateMachineType,
} from '@loopstack/shared';
import { ConfigurationService } from '../../configuration';

@Injectable()
export class StateMachineConfigService {
  constructor(private loopConfigService: ConfigurationService) {}

  getTemplate(name: string) {
    const stateMachine = this.loopConfigService.get<StateMachineType>(
      'workflowTemplates',
      name,
    );
    if (!stateMachine) {
      throw new Error(
        `State machine template with name ${name} does not exist.`,
      );
    }

    return this.getConfig(stateMachine);
  }

  getConfig(stateMachine: StateMachineType): StateMachineType {
    let transitions: WorkflowTransitionType[] = stateMachine.transitions ?? [];
    let handlers: StateMachineHandlerType[] = stateMachine.handlers ?? [];

    if (stateMachine.extends) {
      const parentStateMachine = this.getTemplate(stateMachine.extends);
      transitions = _.unionBy(
        transitions,
        parentStateMachine?.transitions ?? [],
        'name',
      );
      handlers = [...(parentStateMachine?.handlers ?? []), ...handlers];

      return {
        ...parentStateMachine,
        ...stateMachine,
        transitions,
        handlers,
      };
    }

    return {
      ...stateMachine,
      transitions,
      handlers,
    };
  }
}
