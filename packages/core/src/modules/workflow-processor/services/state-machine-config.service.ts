import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import {
  WorkflowObserverType,
  WorkflowStateMachineType,
  WorkflowTemplateType,
  WorkflowTransitionType,
} from '@loopstack/shared';
import { ConfigurationService } from '../../configuration';

@Injectable()
export class StateMachineConfigService {
  constructor(private loopConfigService: ConfigurationService) {}

  getTemplateFlat(name: string) {
    const stateMachine = this.loopConfigService.get<WorkflowTemplateType>(
      'workflowTemplates',
      name,
    );
    if (!stateMachine) {
      throw new Error(
        `State machine template with name ${name} does not exist.`,
      );
    }

    let transitions: WorkflowTransitionType[] = stateMachine.transitions ?? [];
    let observers: WorkflowObserverType[] = stateMachine.observers ?? [];

    const parentTemplate = stateMachine?.extends;
    if (parentTemplate) {
      const parentConfig = this.getTemplateFlat(parentTemplate);
      transitions = _.unionBy(
        transitions,
        parentConfig.transitions ?? [],
        'name',
      );
      observers = _.unionBy(observers, parentConfig.observers ?? [], 'name');
    }

    return {
      name,
      transitions,
      observers,
    };
  }

  getStateMachineFlatConfig(stateMachineConfig: WorkflowStateMachineType) {
    let transitions: WorkflowTransitionType[] =
      stateMachineConfig.transitions ?? [];
    let observers: WorkflowObserverType[] = stateMachineConfig.observers ?? [];

    if (stateMachineConfig.template) {
      const stateMachine = this.getTemplateFlat(stateMachineConfig.template);
      transitions = _.unionBy(
        transitions,
        stateMachine?.transitions ?? [],
        'name',
      );
      observers = _.unionBy(observers, stateMachine?.observers ?? [], 'name');
    }

    return {
      transitions,
      observers,
    };
  }
}
