import { Injectable } from '@nestjs/common';
import {
  WorkflowObserverConfigInterface,
  WorkflowStateMachineConfigInterface,
  WorkflowTransitionConfigInterface,
} from '@loopstack/shared';
import _ from 'lodash';
import { WorkflowTemplateCollectionService } from '../../configuration/services/workflow-template-collection.service';

@Injectable()
export class StateMachineConfigService {
  constructor(
    private workflowTemplateCollectionService: WorkflowTemplateCollectionService,
  ) {}

  getTemplateFlat(name: string) {
    const stateMachine = this.workflowTemplateCollectionService.getByName(name);
    if (!stateMachine) {
      throw new Error(
        `State machine template with name ${name} does not exist.`,
      );
    }

    let transitions: WorkflowTransitionConfigInterface[] =
      stateMachine.transitions ?? [];
    let observers: WorkflowObserverConfigInterface[] =
      stateMachine.observers ?? [];

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

  getStateMachineFlatConfig(
    stateMachineConfig: WorkflowStateMachineConfigInterface,
  ) {
    let transitions: WorkflowTransitionConfigInterface[] =
      stateMachineConfig.transitions ?? [];
    let observers: WorkflowObserverConfigInterface[] =
      stateMachineConfig.observers ?? [];

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
