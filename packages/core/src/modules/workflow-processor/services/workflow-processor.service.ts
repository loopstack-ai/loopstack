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

  createIndex(ltreeIndex: string, increment: number = 1): string {
    const parts = ltreeIndex.split('.').map(Number);
    parts[parts.length - 1] += increment;
    return parts.join('.');
  }

  async runSequenceType(
    sequenceConfig: WorkflowPipelineType,
    context: ContextInterface,
  ): Promise<ContextInterface | undefined> {
    const sequence = _.map(sequenceConfig.items, 'name');

    // create a new index level
    const index = `${context.index}.0`;

    let lastContext = this.contextService.create(context);
    for (let i = 0; i < sequence.length; i++) {
      const itemName = sequence[i];
      lastContext.index = this.createIndex(index, i + 1);
      lastContext = await this.processChild(itemName, lastContext);

      if (this.stop) {
        break;
      }
    }

    return lastContext;
  }

  async createNamespace(context: ContextInterface, props: NamespacePropsType): Promise<ContextInterface> {
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

  async prepareAllContexts(context: ContextInterface, factory: WorkflowFactoryType, items: string[]): Promise<ContextInterface[]> {
    //create a new index level
    const index = `${context.index}.0`;

    const contexts: ContextInterface[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const label = factory.iterator.label
        ? this.valueParserService.evalWithContextAndItem<string>(
          factory.iterator.label,
          {
            context,
            item,
            index: i + 1,
          },
        )
        : item.toString();

      const metadata = factory.iterator.meta
        ? this.valueParserService.evalWithContextAndItem<Record<string, any>>(
          factory.iterator.meta,
          {
            context,
            item,
            index: i + 1,
          },
        )
        : undefined;

      // create a new namespace for each child
      const localContext = await this.createNamespace(context, {
        label,
        meta: metadata,
      });

      // set the new index
      localContext.index = this.createIndex(index, i + 1);
      contexts.push(localContext);
    }

    return contexts;
  }

  async cleanupNamespace(parentContext: ContextInterface, validContexts: ContextInterface[]) {
    const newChildNamespaceIds = validContexts.map((item) => item.namespace.id);
    const originalChildNamespaces = await this.namespacesService.getChildNamespaces(parentContext.namespace.id);
    const danglingNamespaces = originalChildNamespaces.filter((item) => !newChildNamespaceIds.includes(item.id));
    if (danglingNamespaces.length) {
      await this.namespacesService.delete(danglingNamespaces);
    }
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

    // create or load all context / namespaces
    const preparedChildContexts = await this.prepareAllContexts(context, factory, items);

    // cleanup old namespaces
    await this.cleanupNamespace(context, preparedChildContexts);

    // process the child elements sequential
    for (const childContext of preparedChildContexts) {
      await this.processChild(workflowName, childContext);

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
    if (workflowConfig.namespace) {
      context = await this.createNamespace(context, workflowConfig.namespace);
    }

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
      projectId: context.projectId,
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
