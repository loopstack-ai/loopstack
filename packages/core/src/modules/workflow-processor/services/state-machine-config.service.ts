import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import {
  WorkflowTransitionType,
  StateMachineType,
  UISchemaType,
  ConfigElement,
} from '@loopstack/shared';
import { JSONSchemaType } from 'ajv';

@Injectable()
export class StateMachineConfigService {

  public getConfig(
    configElement: ConfigElement<StateMachineType>,
  ): ConfigElement<StateMachineType> {
    let transitions: WorkflowTransitionType[] =
      configElement.config.transitions ?? [];
    let args: Record<string, any> = configElement.config.arguments ?? {};
    let parameters: JSONSchemaType<any> = configElement.config.parameters ?? {
      type: 'object',
    };
    let ui: UISchemaType = configElement.config.ui ?? {};

    if (!configElement.config.extends) {
      return {
        ...configElement,
        config: {
          ...configElement.config,
          transitions,
          arguments: args,
          parameters,
        },
      };
    }

    const parentStateMachine = {} as ConfigElement<StateMachineType>;
    // todo
    // this.getConfig({}
    //   this.loopConfigService.resolveConfig<StateMachineType>(
    //     'workflows',
    //     configElement.config.extends,
    //     configElement.includes,
    //   ),
    // );

    transitions = _.unionBy(
      transitions,
      parentStateMachine?.config.transitions ?? [],
      'name',
    );
    args = _.merge({}, args, parentStateMachine.config.arguments);
    parameters = _.merge({}, parameters, parentStateMachine.config.parameters);
    ui = _.merge({}, ui, parentStateMachine.config.ui);

    const mergedImportMap = Array.from(new Map([
      ...parentStateMachine.includes,
      ...configElement.includes,
    ]).entries());

    return {
      ...configElement,
      includes: mergedImportMap,
      config: {
        ...configElement.config,
        transitions,
        arguments: args,
        parameters,
        ui,
      },
    };
  }
}
