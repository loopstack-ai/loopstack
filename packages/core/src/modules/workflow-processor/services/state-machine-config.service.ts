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

  getTemplateFlat(name: string) {
    const stateMachine = this.loopConfigService.get<StateMachineType>(
      'stateMachineTemplates',
      name,
    );
    if (!stateMachine) {
      throw new Error(
        `State machine template with name ${name} does not exist.`,
      );
    }

    return this.getStateMachineFlatConfig(stateMachine);
  }

  getStateMachineFlatConfig(stateMachine: StateMachineType): StateMachineType {
    let transitions: WorkflowTransitionType[] = stateMachine.transitions ?? [];
    let handlers: StateMachineHandlerType[] = stateMachine.handlers ?? [];

    if (stateMachine.extends) {
      const parentStateMachine = this.getTemplateFlat(stateMachine.extends);
      transitions = _.unionBy(
        transitions,
        parentStateMachine?.transitions ?? [],
        'name',
      );
      handlers = [...(parentStateMachine?.handlers ?? []), ...handlers];
    }

    return {
      ...stateMachine,
      transitions,
      handlers: handlers,
    };
  }
}
