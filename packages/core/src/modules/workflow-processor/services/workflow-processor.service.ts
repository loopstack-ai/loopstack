import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { ContextService } from '../../common';
import { ConfigValueParserService } from '../../common';
import { StateMachineProcessorService } from './state-machine-processor.service';
import { ConfigurationService } from '../../configuration';
import { NamespacesService, WorkflowService } from '../../persistence';
import {
  ContextInterface, NamespacePropsType,
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
    context: ContextInterface,
  ): Promise<ContextInterface | undefined> {
    const sequence = _.map(sequenceConfig.items, 'name');

    // create a new index level
    const index = `${context.index}.0`;

    // add a namespace when configured
    let lastContext = this.contextService.create(context);
    if (sequenceConfig.namespace) {
      lastContext = await this.createNamespace(context, sequenceConfig.namespace);
    }

    for (let i = 0; i < sequence.length; i++) {
      const itemName = sequence[i];

      lastContext.index = this.incrementIndex(index, i + 1);

      lastContext = await this.processChild(itemName, lastContext);

      if (this.stop) {
        break;
      }
    }

    return lastContext;
  }

  async createNamespace(context: ContextInterface, props: NamespacePropsType) {
    let clone = this.contextService.create(context);
    clone.namespace = await this.namespacesService.create({
      name: props.label ?? 'Group',
      model: context.model,
      projectId: context.projectId,
      workspaceId: context.workspaceId,
      parent: context.namespace,
      metadata: props.meta ?? {},
      createdBy: context.userId,
    });
    clone.labels.push(clone.namespace.name);

    return clone;
  }

  async runFactoryType(
    factory: WorkflowFactoryType,
    context: ContextInterface,
  ): Promise<ContextInterface> {
    const workflowName = factory.workflow;

    if (!this.workflowExists(factory.workflow)) {
      throw new Error(`Workflow ${workflowName} for factory does not exist.`);
    }

    const items = this.valueParserService.evalWithContext<string[]>(
      factory.iterator.source,
      { context },
    );

    if (!Array.isArray(items)) {
      throw new Error(
        `Iterator values in ${factory.iterator.source} must be array, got ${typeof items}`,
      );
    }

    //create a new index level
    const index = `${context.index}.0`;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // create a new context for each child
      let localContext = this.contextService.create(context);
      localContext.index = this.incrementIndex(index, i + 1);

      const label = factory.iterator.label
        ? this.valueParserService.evalWithContextAndItem<string>(
            factory.iterator.label,
            {
              context: localContext,
              item,
            },
          )
        : item.toString();

      const metadata = factory.iterator.meta
        ? this.valueParserService.evalWithContextAndItem<Record<string, any>>(
            factory.iterator.meta,
            {
              context: localContext,
              item,
            },
          )
        : undefined;

      // create namespace for the group iterator and make sure the value includes a unique id,
      // so there is no risk of re-using the same value for different things within
      // the same workspace and project model
      localContext = await this.createNamespace(context, {
        label,
        meta: metadata
      });

      // since a factory always adds a namespace and thus, separates the context
      // we do not need to update the processState context
      await this.processChild(workflowName, localContext);

      if (this.stop) {
        break;
      }
    }

    return context;
  }

  async runStateMachineType(
    config: WorkflowStateMachineType,
    context: ContextInterface,
  ) {
    // create or load state if needed
    const currentWorkflow = await this.getWorkflow(config, context);

    const workflow = await this.stateMachineProcessorService.processStateMachine(
      context,
      currentWorkflow,
      config,
    );

    if (workflow.place !== 'finished') {
      this.stop = true;
    } else {
      // update the context if changed in workflow
      if (workflow.contextUpdate) {
        context.custom = {
          ...context.custom,
          ...workflow.contextUpdate,
        }
      }
    }

    return context;
  }

  async processWorkflow(
    workflowConfig: WorkflowType,
    context: ContextInterface,
  ): Promise<ContextInterface | undefined> {
    switch (workflowConfig.type) {
      case 'pipeline':
        return this.runSequenceType(workflowConfig, context);
      case 'factory':
        return this.runFactoryType(workflowConfig, context);
      case 'stateMachine':
        return this.runStateMachineType(workflowConfig, context);
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

    const newContext = await this.processWorkflow(workflowConfig, context);
    // if the workflow did execute under the same namespace, pass over the updated local context
    if (newContext && newContext.namespace.id === context.namespace.id) {
      return newContext;
    }

    return context;
  }

  start(entrypoint: string, context: ContextInterface) {
    this.stop = false;
    return this.processChild(entrypoint, context);
  }
}
