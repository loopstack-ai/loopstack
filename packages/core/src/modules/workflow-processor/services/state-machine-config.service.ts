import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import {
  WorkflowObserverType,
  WorkflowTransitionType, StateMachineType,
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

  getStateMachineFlatConfig(stateMachine: StateMachineType) {
    let transitions: WorkflowTransitionType[] =
      stateMachine.transitions ?? [];
    let observers: WorkflowObserverType[] = stateMachine.observers ?? [];

    if (stateMachine.extends) {
      const parentStateMachine = this.getTemplateFlat(stateMachine.extends);
      transitions = _.unionBy(
        transitions,
        parentStateMachine?.transitions ?? [],
        'name',
      );
      observers = [
        ...(parentStateMachine?.observers ?? []),
        ...observers,
      ];
    }

    return {
      transitions,
      observers,
    };
  }
}
