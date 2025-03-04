import { Injectable } from '@nestjs/common';
import { WorkflowCollectionService } from '../../configuration/services/workflow-collection.service';
import {
  WorkflowConfigInterface,
  WorkflowFactorySchemaConfigInterface,
  WorkflowSequenceConfigInterface,
  WorkflowStateMachineConfigInterface,
} from '@loopstack/shared';
import { ToolExecutionService } from './tool-execution.service';
import { ContextInterface } from '../interfaces/context.interface';
import _ from 'lodash';
import { ProcessStateInterface } from '../interfaces/process-state.interface';
import { ContextService } from './context.service';
import { ValueParserService } from './value-parser.service';
import { StateMachineProcessorService } from '../../state-machine/services/state-machine-processor.service';
import { WorkflowEntity } from '../../persistence/entities';
import { WorkflowService } from '../../persistence/services/workflow.service';
import { NamespacesService } from '../../persistence/services/namespace.service';
import crypto from 'crypto';

@Injectable()
export class WorkflowProcessorService {
  constructor(
    private contextService: ContextService,
    private workflowCollectionService: WorkflowCollectionService,
    private toolExecutionService: ToolExecutionService,
    private valueParserService: ValueParserService,
    private stateMachineProcessorService: StateMachineProcessorService,
    private workflowService: WorkflowService,
    private namespacesService: NamespacesService,
  ) {}

  workflowExists(name: string): boolean {
    return this.workflowCollectionService.has(name);
  }

  async runSequenceType(
    sequenceConfig: WorkflowSequenceConfigInterface,
    processState: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    const sequence = _.map(sequenceConfig.items, 'name');
    for (const itemName of sequence) {
      processState.context = await this.processChild(
        itemName,
        processState.context,
        processState.context,
      );
    }
    return processState;
  }

  generateUniqueNamespace(value: string): string {
    return `${value}_${crypto.randomUUID()}`;
  }

  async runFactoryType(
    factory: WorkflowFactorySchemaConfigInterface,
    processState: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    const workflowName = factory.workflow;

    if (!this.workflowExists(factory.workflow)) {
      throw new Error(`Workflow ${workflowName} for factory does not exist.`);
    }

    const iteratorValues = this.valueParserService.parseValue(
      factory.iterator.values,
      processState,
    );

    if (!Array.isArray(iteratorValues)) {
      throw new Error(
        `Iterator values for ${factory.iterator.name} must be array, got ${typeof iteratorValues}`,
      );
    }

    const localContext = this.contextService.create(processState.context);

    localContext.iteratorGroup = factory.iterator.name;

    // create namespace for the iterator key (group)
    const keyNamespace = await this.namespacesService.create({
      name: localContext.iteratorGroup,
      model: localContext.model,
      projectId: localContext.projectId,
      workspaceId: localContext.workspaceId,
      parentId: localContext.namespaces[localContext.namespaces.length - 1]?.id,
      metadata: undefined,
    });
    localContext.namespaces.push(keyNamespace);

    for (const iterator of iteratorValues) {
      // create a new context for each child
      const childContext = this.contextService.create(localContext);

      // set iterator
      localContext.iteratorValue = iterator;

      // create namespace for the group iterator and make sure the value includes a unique id,
      // so there is no risk of re-using the same value for different things within
      // the same workspace and project model
      const valueNamespace = await this.namespacesService.create({
        name: this.generateUniqueNamespace(localContext.iteratorValue!),
        model: childContext.model,
        projectId: childContext.projectId,
        workspaceId: childContext.workspaceId,
        parentId:
          childContext.namespaces[childContext.namespaces.length - 1]?.id,
        metadata: undefined,
      });
      childContext.namespaces.push(valueNamespace);

      // process the child workflows and update the processing context
      // note, we use previous context as target so that namespaces will not be carried over
      processState.context = await this.processChild(
        workflowName,
        processState.context,
        childContext,
      );
    }

    return processState;
  }

  async runStateMachineType(
    stateMachineConfig: WorkflowStateMachineConfigInterface,
    processState: ProcessStateInterface,
  ) {
    processState.workflow =
      await this.stateMachineProcessorService.processStateMachine(
        processState.context,
        processState.workflow!,
        stateMachineConfig,
      );

    return processState;
  }

  async processWorkflow(
    workflowConfig: WorkflowConfigInterface,
    processState: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    console.log(
      'Processing workflow:',
      workflowConfig.name,
      processState.context.namespaces,
    );

    if (workflowConfig.sequence) {
      return this.runSequenceType(workflowConfig.sequence, processState);
    }

    if (workflowConfig.factory) {
      return this.runFactoryType(workflowConfig.factory, processState);
    }

    if (workflowConfig.stateMachine) {
      return this.runStateMachineType(
        workflowConfig.stateMachine,
        processState,
      );
    }

    throw new Error(
      'workflow needs to implement a sequence or a factory or a stateMachine',
    );
  }

  async getWorkflow(
    workflowName: string,
    context: ContextInterface,
  ): Promise<WorkflowEntity> {
    let workflow = await this.workflowService.createFindQuery(
      context.projectId,
      {
        name: workflowName,
        namespaceIds: context.namespaces.map((item) => item.id),
      },
    ).getOne();

    if (workflow) {
      return workflow;
    }

    return this.workflowService.create({
      projectId: context.projectId,
      createdBy: context.userId,
      namespaces: context.namespaces,
      name: workflowName,
    });
  }

  isStateful(workflowConfig: WorkflowConfigInterface) {
    return !!workflowConfig.stateMachine;
  }

  async processChild(
    name: string,
    targetContext: ContextInterface,
    sourceContext: ContextInterface,
  ): Promise<ContextInterface> {
    const workflowConfig = this.workflowCollectionService.getByName(name);
    if (!workflowConfig) {
      throw new Error(`workflow with name "${name}" not found.`);
    }

    // create local context, so no unwanted changes are applied to the actual context to be returned
    const localContext = this.contextService.create(sourceContext);

    // create or load state if needed
    const workflow = this.isStateful(workflowConfig)
      ? await this.getWorkflow(workflowConfig.name, localContext)
      : undefined;
    let processState: ProcessStateInterface = {
      context: localContext,
      workflow,
    };

    // before functions update the local context
    processState = await this.toolExecutionService.applyTools(
      workflowConfig.prepare,
      processState,
      processState,
    );

    processState = await this.processWorkflow(workflowConfig, processState);

    // workflows return the context and apply actions
    // they do not pass down its local context
    // instead, tools can apply changes to it
    processState = await this.toolExecutionService.applyTools(
      workflowConfig.export,
      { context: targetContext, workflow: undefined },
      processState,
    );

    return processState.context;
  }
}
