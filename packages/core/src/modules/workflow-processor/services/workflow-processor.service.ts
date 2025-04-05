import { Injectable } from '@nestjs/common';
import { ToolExecutionService } from './tool-execution.service';
import _ from 'lodash';
import { ContextService } from '../../common/services/context.service';
import { ConfigValueParserService } from '../../common/services/config-value-parser.service';
import { StateMachineProcessorService } from './state-machine-processor.service';
import crypto from 'crypto';
import { ConfigurationService } from '../../configuration';
import { NamespacesService, WorkflowService } from '../../persistence';
import {
  ContextInterface,
  ProcessStateInterface,
  WorkflowData,
  WorkflowEntity,
  WorkflowFactoryType,
  WorkflowPipelineType,
  WorkflowStateMachineType,
  WorkflowType,
} from '@loopstack/shared';

@Injectable()
export class WorkflowProcessorService {
  stop: boolean = false;

  constructor(
    private contextService: ContextService,
    private loopConfigService: ConfigurationService,
    private toolExecutionService: ToolExecutionService,
    private valueParserService: ConfigValueParserService,
    private stateMachineProcessorService: StateMachineProcessorService,
    private workflowService: WorkflowService,
    private namespacesService: NamespacesService,
  ) {}

  workflowExists(name: string): boolean {
    return this.loopConfigService.has('workflows', name);
  }

  incrementIndex(ltreeIndex: string, value: number = 1): string {
    const parts = ltreeIndex.split('.').map(Number);
    parts[parts.length - 1] += value;
    return parts.join('.');
  }

  async runSequenceType(
    sequenceConfig: WorkflowPipelineType,
    processState: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    const sequence = _.map(sequenceConfig.items, 'name');

    //create a new index level
    const index = `${processState.context.index}.0`;

    for (let i = 0; i < sequence.length; i++) {
      const itemName = sequence[i];

      // create local context, so no unwanted changes are applied to the actual context to be returned
      const localContext = this.contextService.create(processState.context);
      localContext.index = this.incrementIndex(index, i + 1);

      processState.context = await this.processChild(itemName, localContext);

      if (this.stop) {
        break;
      }
    }
    return processState;
  }

  generateUniqueNamespace(value: string): string {
    return `${value}_${crypto.randomUUID()}`;
  }

  async runFactoryType(
    factory: WorkflowFactoryType,
    processState: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    const workflowName = factory.workflow;

    if (!this.workflowExists(factory.workflow)) {
      throw new Error(`Workflow ${workflowName} for factory does not exist.`);
    }

    const items = this.valueParserService.parseValue(
      factory.iterator.source,
      processState,
    );

    if (!Array.isArray(items)) {
      throw new Error(
        `Iterator values in ${factory.iterator.source} must be array, got ${typeof items}`,
      );
    }

    //create a new index level
    const index = `${processState.context.index}.0`;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // create a new context for each child
      const localContext = this.contextService.create(processState.context);
      localContext.index = this.incrementIndex(index, i + 1);

      const label = factory.iterator.label
        ? this.valueParserService.parseValue(factory.iterator.label, {
            item,
            context: localContext,
            workflow: processState.workflow,
          })
        : item.toString();

      const metadata = factory.iterator.meta
        ? this.valueParserService.parseValue(factory.iterator.meta, {
            item,
            context: localContext,
            workflow: processState.workflow,
          })
        : undefined;

      // create namespace for the group iterator and make sure the value includes a unique id,
      // so there is no risk of re-using the same value for different things within
      // the same workspace and project model
      localContext.namespace = await this.namespacesService.create({
        name: this.generateUniqueNamespace(label),
        model: localContext.model,
        projectId: localContext.projectId,
        workspaceId: localContext.workspaceId,
        parent: localContext.namespace,
        metadata: metadata,
        createdBy: localContext.userId,
      });
      localContext.labels.push(localContext.namespace.name);

      // since a factory always adds a namespace and thus, separates the context
      // we do not need to update the processState context
      await this.processChild(workflowName, localContext);

      if (this.stop) {
        break;
      }
    }

    return processState;
  }

  async runStateMachineType(
    stateMachineConfig: WorkflowStateMachineType,
    processState: ProcessStateInterface,
  ) {
    // before functions update the local context
    if (stateMachineConfig.prepare) {
      for (const item of stateMachineConfig.prepare) {
        const result = await this.toolExecutionService.applyTool(
          item,
          processState.workflow,
          processState.context,
          processState.data,
        );

        // if (workflow) {
        //   processState.workflow = workflow;
        // }
        if (result.context) {
          processState.context = result.context;
        }
        if (result.data) {
          processState.data = result.data;
        }
      }
    }

    processState.workflow =
      await this.stateMachineProcessorService.processStateMachine(
        processState,
        stateMachineConfig,
      );

    if (processState.workflow.place !== 'finished') {
      this.stop = true;
    }

    return processState;
  }

  async processWorkflow(
    workflowConfig: WorkflowType,
    processState: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    switch (workflowConfig.type) {
      case 'pipeline':
        return this.runSequenceType(workflowConfig, processState);
      case 'factory':
        return this.runFactoryType(workflowConfig, processState);
      case 'stateMachine':
        return this.runStateMachineType(workflowConfig, processState);
    }

    throw new Error('Unknown workflow type');
  }

  async getWorkflow(
    workflowConfig: WorkflowType,
    context: ContextInterface,
  ): Promise<WorkflowEntity> {
    const workflow = await this.workflowService
      .createFindQuery(context.namespace?.id, {
        name: workflowConfig.name,
        labels: context.labels,
      })
      .getOne();

    if (workflow) {
      return workflow;
    }

    return this.workflowService.create({
      createdBy: context.userId,
      labels: context.labels,
      namespace: context.namespace ?? undefined,
      name: workflowConfig.name,
      title: workflowConfig.title,
      index: context.index,
    });
  }

  isStateful(workflowConfig: WorkflowType) {
    return (
      workflowConfig.type === 'stateMachine' || workflowConfig.type === 'tool'
    );
  }

  async processChild(
    name: string,
    context: ContextInterface,
  ): Promise<ContextInterface> {
    const workflowConfig = this.loopConfigService.get<WorkflowType>(
      'workflows',
      name,
    );
    if (!workflowConfig) {
      throw new Error(`workflow with name "${name}" not found.`);
    }

    const data: WorkflowData = {};

    // create or load state if needed
    const workflow = this.isStateful(workflowConfig)
      ? await this.getWorkflow(workflowConfig, context)
      : undefined;

    let processState: ProcessStateInterface = {
      context,
      data,
      workflow,
    };

    processState = await this.processWorkflow(workflowConfig, processState);

    // if the workflow did execute under the same namespace, pass over the updated local context
    if (processState.context.namespace.id === context.namespace.id) {
      return processState.context;
    }

    return context;
  }

  start(entrypoint: string, context: ContextInterface) {
    this.stop = false;
    return this.processChild(entrypoint, context);
  }
}
