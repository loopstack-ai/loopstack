import { Injectable } from '@nestjs/common';
import { ContextInterface } from '../interfaces/context.interface';
import { WorkflowStateContextInterface } from '../interfaces/workflow-state-context.interface';
import { TransitionContextInterface } from '../interfaces/transition-context.interface';
import { TransitionResultInterface } from '../interfaces';
import { WorkflowEntity } from '../../persistence/entities';
import { WorkflowObserverType } from '../../configuration/schemas/workflow-observer.schema';
import { ActionRegistry, LoopConfigService } from '../../configuration';
import { DocumentService } from '../../persistence/services/document.service';
import { ServiceConfigType } from '../../configuration/schemas/service-config.schema';

@Injectable()
export class StateMachineActionService {
  constructor(
    private readonly actionRegistry: ActionRegistry,
    private readonly loopConfigService: LoopConfigService,
    private readonly documentService: DocumentService,

  ) {}

  async executeAction(
    observer: WorkflowObserverType,
    workflowContext: ContextInterface,
    workflowStateContext: WorkflowStateContextInterface,
    transitionContext: TransitionContextInterface,
    workflow: WorkflowEntity,
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
      workflowContext,
      workflowStateContext,
      transitionContext,
      workflow,
      props,
    });

    // create and add documents from action
    if (result.documents?.length) {
      for (const documentData of result.documents) {
        this.documentService.create(workflow, workflowContext, documentData);
      }
    }

    return result;
  }
}
