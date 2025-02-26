import { Injectable } from '@nestjs/common';
import { WorkflowCollectionService } from '../../configuration/services/workflow-collection.service';
import {
  WorkflowConfigInterface,
  WorkflowFactorySchemaConfigInterface, WorkflowSequenceConfigInterface, WorkflowStateMachineConfigInterface,
} from '@loopstack/shared';
import { ToolExecutionService } from './tool-execution.service';
import { ContextInterface } from '../interfaces/context.interface';
import _ from 'lodash';
import { ProcessStateInterface } from '../interfaces/process-state.interface';
import { ContextService } from './context.service';
import { ValueParserService } from './value-parser.service';
import { StateMachineProcessorService } from '../../state-machine/services/state-machine-processor.service';
import {WorkflowEntity} from "../../persistence/entities/workflow.entity";
import {WorkflowService} from "../../persistence/services/workflow.service";

@Injectable()
export class WorkflowProcessorService {
  constructor(
    private contextService: ContextService,
    private workflowCollectionService: WorkflowCollectionService,
    private toolExecutionService: ToolExecutionService,
    private valueParserService: ValueParserService,
    private stateMachineProcessorService: StateMachineProcessorService,
    private workflowService: WorkflowService,
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
      processState.context = await this.processChild(itemName, processState.context);
    }
    return processState;
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

    for (const iterator of iteratorValues) {
      // set iterator
      processState.context.iterator = { key: factory.iterator.name, value: iterator };

      // set namespace
      processState.context.namespaces[processState.context.iterator.key] = processState.context.iterator.value;

      // process the child workflows
      processState.context = await this.processChild(workflowName, processState.context);
    }

    return processState;
  }

  async runStateMachineType(
    stateMachineConfig: WorkflowStateMachineConfigInterface,
    processState: ProcessStateInterface,
  ) {
    processState.workflow = await this.stateMachineProcessorService.processStateMachine(
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
      return this.runStateMachineType(workflowConfig.stateMachine, processState);
    }

    throw new Error(
      'workflow needs to implement a sequence or a factory or a stateMachine',
    );
  }

  async getWorkflow(
      workflowName: string,
      context: ContextInterface,
  ): Promise<WorkflowEntity> {
    let workflow = await this.workflowService.loadByIdentity(
        context.projectId,
        workflowName,
        context.namespaces,
    );

    if (workflow) {
      return workflow;
    }

    return this.workflowService.createWorkflow({
      projectId: context.projectId,
      workspaceId: context.workspaceId,
      createdBy: context.userId,
      namespaces: context.namespaces,
      name: workflowName,
    });
  }

  isStateful(workflowConfig: WorkflowConfigInterface) {
    return !!workflowConfig.stateMachine
  }

  async processChild(
    name: string,
    parentContext: ContextInterface,
  ): Promise<ContextInterface> {
    const workflowConfig = this.workflowCollectionService.getByName(name);
    if (!workflowConfig) {
      throw new Error(`workflow with name "${name}" not found.`);
    }

    const context = this.contextService.create(parentContext);

    // create or load state if needed
    const workflow = this.isStateful(workflowConfig) ? await this.getWorkflow(workflowConfig.name, context) : undefined;
    let processState: ProcessStateInterface = { context, workflow };

    // before functions update the working context
    processState = this.toolExecutionService.applyTools(
      workflowConfig.prepare,
      processState,
      processState,
    );

    processState = await this.processWorkflow(workflowConfig, processState);

    // workflows return the parent context and apply actions
    // they do not pass down its working context
    // instead, tools can apply changes to it
    processState = this.toolExecutionService.applyTools(
      workflowConfig.export,
      { context: parentContext, workflow: undefined },
      processState,
    );

    return processState.context;
  }
}
