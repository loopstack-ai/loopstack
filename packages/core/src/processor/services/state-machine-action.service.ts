import { Injectable } from '@nestjs/common';
import { WorkflowStateContextInterface } from '../interfaces/workflow-state-context.interface';
import { TransitionContextInterface } from '../interfaces/transition-context.interface';
import { TransitionResultInterface } from '../interfaces';
import { WorkflowObserverType } from '../../configuration/schemas/workflow-observer.schema';
import { ActionRegistry, LoopConfigService } from '../../configuration';
import { DocumentService } from '../../persistence/services/document.service';
import { ServiceConfigType } from '../../configuration/schemas/service-config.schema';
import { ProcessStateInterface } from '../interfaces/process-state.interface';

@Injectable()
export class StateMachineActionService {
  constructor(
    private readonly actionRegistry: ActionRegistry,
    private readonly loopConfigService: LoopConfigService,
    private readonly documentService: DocumentService,

  ) {}

  async executeAction(
    observer: WorkflowObserverType,
    processState: ProcessStateInterface,
    workflowStateContext: WorkflowStateContextInterface,
    transitionContext: TransitionContextInterface,
  ): Promise<TransitionResultInterface> {
    const actionConfig = this.loopConfigService.get<ServiceConfigType>('actions', observer.action);
    if (!actionConfig) {
      throw new Error(`Config for action ${observer.action} not found.`);
    }

    const actionInstance = this.actionRegistry.getActionByName(
      actionConfig.service,
    );
    if (!actionInstance) {
      throw new Error(`Action service ${actionConfig.service} not found.`);
    }

    console.log(`Executing action ${actionConfig.service}`);

    const props = actionConfig.props;
    // todo parse action props from actionConfig with function call

    const result = await actionInstance.execute({
      ...processState,
      workflowStateContext,
      transitionContext,
      props,
    });

    // create and add documents from action
    if (result.documents?.length) {
      for (const documentData of result.documents) {
        this.documentService.create(processState.workflow!, processState.context, documentData);
      }
    }

    return result;
  }
}
