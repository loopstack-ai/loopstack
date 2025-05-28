import { Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';
import { ContextService } from '../../common';
import { ValueParserService } from '../../common';
import { StateMachineProcessorService } from './state-machine-processor.service';
import { ConfigurationService } from '../../configuration';
import { WorkflowService } from '../../persistence';
import {
  ContextInterface,
  WorkflowEntity,
  WorkflowFactoryType,
  WorkflowPipelineType,
  WorkflowStateMachineType,
  WorkflowType,
} from '@loopstack/shared';
import { NamespaceProcessorService } from './namespace-processor.service';

@Injectable()
export class WorkflowProcessorService {
  private readonly logger = new Logger(WorkflowProcessorService.name);
  stop: boolean = false;

  constructor(
    private contextService: ContextService,
    private loopConfigService: ConfigurationService,
    private valueParserService: ValueParserService,
    private stateMachineProcessorService: StateMachineProcessorService,
    private workflowService: WorkflowService,
    private namespaceProcessorService: NamespaceProcessorService,
  ) {}

  workflowExists(name: string): boolean {
    return this.loopConfigService.has('workflows', name);
  }

  createIndex(ltreeIndex: string, increment: number = 1): string {
    const parts = ltreeIndex.split('.').map(Number);
    parts[parts.length - 1] += increment;
    return parts.map((part) => part.toString().padStart(4, '0')).join('.');
  }

  async runSequenceType(
    sequenceConfig: WorkflowPipelineType,
    context: ContextInterface,
  ): Promise<ContextInterface | undefined> {
    const sequence = sequenceConfig.sequence;

    // create a new index level
    const index = `${context.index}.0`;

    let lastContext = this.contextService.create(context);
    for (let i = 0; i < sequence.length; i++) {
      const item = sequence[i];

      const workflowName = typeof item === 'object' ? item.name : item;

      this.logger.debug(`Processing Sequence Item ${workflowName}`);

      const evaluatedItem = this.valueParserService.evalWithContext<{
        name: string;
        condition?: boolean;
      }>(item, { context: lastContext });

      if (evaluatedItem.condition === false) {
        continue;
      }

      lastContext.index = this.createIndex(index, i + 1);
      lastContext = await this.processChild(workflowName, lastContext);

      if (this.stop) {
        break;
      }
    }

    return lastContext;
  }

  async prepareAllContexts(
    context: ContextInterface,
    factory: WorkflowFactoryType,
    items: string[],
  ): Promise<ContextInterface[]> {
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
      const localContext = await this.namespaceProcessorService.createNamespace(
        context,
        {
          label,
          meta: metadata,
        },
      );

      // set the new index
      localContext.index = this.createIndex(index, i + 1);
      contexts.push(localContext);
    }

    return contexts;
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
    const preparedChildContexts = await this.prepareAllContexts(
      context,
      factory,
      items,
    );

    // cleanup old namespaces
    await this.namespaceProcessorService.cleanupNamespace(
      context,
      preparedChildContexts,
    );

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

    const workflow =
      await this.stateMachineProcessorService.processStateMachine(
        context,
        currentWorkflow,
        config,
      );

    if (workflow.place !== 'complete') {
      this.stop = true;
    } else {
      // update the context if changed in workflow
      if (workflow.contextUpdate) {
        context.custom = {
          ...context.custom,
          ...workflow.contextUpdate,
        };
      }
    }

    return context;
  }

  async processWorkflow(
    workflowConfig: WorkflowType,
    context: ContextInterface,
  ): Promise<ContextInterface | undefined> {
    if (workflowConfig.namespace) {
      context = await this.namespaceProcessorService.createNamespace(
        context,
        workflowConfig.namespace,
      );
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
