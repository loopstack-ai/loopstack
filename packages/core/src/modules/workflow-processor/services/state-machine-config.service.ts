import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import {
  WorkflowTransitionType,
  StateMachineType,
  UISchemaType,
} from '@loopstack/shared';
import { ConfigurationService } from '../../configuration';
import { JSONSchemaType } from 'ajv';

@Injectable()
export class StateMachineConfigService {
  constructor(private loopConfigService: ConfigurationService) {}

  private getWorkflowConfig(name: string) {
    const stateMachine = this.loopConfigService.get<StateMachineType>(
      'workflows',
      name,
    );

    if (!stateMachine) {
      throw new Error(
        `State machine template with name ${name} does not exist.`,
      );
    }

    if (stateMachine.type !== 'stateMachine') {
      throw new Error(
        `State machines can only extend other workflows of type "stateMachine"`,
      );
    }

    return this.getConfig(stateMachine);
  }

  public getConfig(stateMachine: StateMachineType): StateMachineType {
    let transitions: WorkflowTransitionType[] = stateMachine.transitions ?? [];
    let args: Record<string, any> = stateMachine.arguments ?? {};
    let parameters: JSONSchemaType<any> = stateMachine.parameters ?? {
      type: 'object',
    };
    let ui: UISchemaType = stateMachine.ui ?? {};

    if (!stateMachine.extends) {
      return {
        ...stateMachine,
        transitions,
        arguments: args,
        parameters,
      };
    }

    const parentStateMachine = this.getWorkflowConfig(stateMachine.extends);
    transitions = _.unionBy(
      transitions,
      parentStateMachine?.transitions ?? [],
      'name',
    );
    args = _.merge(args, parentStateMachine.arguments);
    parameters = _.merge(parameters, parentStateMachine.parameters);
    ui = _.merge(ui, parentStateMachine.ui);

    return {
      ...stateMachine,
      transitions,
      arguments: args,
      parameters,
      ui,
    };
  }
}
