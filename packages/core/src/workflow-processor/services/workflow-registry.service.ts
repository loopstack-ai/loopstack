import { Injectable, Logger, OnApplicationBootstrap, Type } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { BLOCK_TYPE_METADATA_KEY, BaseWorkflow, deriveWorkflowIdentifier, getBlockConfig } from '@loopstack/common';

/**
 * Registry of all @Workflow() singletons, built at bootstrap via NestJS DiscoveryService.
 *
 * Replaces the workflow lookup parts of BlockDiscoveryService.
 * Used by WorkflowProcessorService and WorkflowRunner to resolve
 * workflow instances by class reference or decorator name.
 */
@Injectable()
export class WorkflowRegistryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkflowRegistryService.name);
  private readonly byClass = new Map<Type, BaseWorkflow>();
  private readonly byName = new Map<string, BaseWorkflow>();

  constructor(private readonly discovery: DiscoveryService) {}

  onApplicationBootstrap(): void {
    const providers = this.discovery.getProviders();

    for (const wrapper of providers) {
      if (!wrapper.metatype || !wrapper.instance) continue;

      const blockType = Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, wrapper.metatype);
      if (blockType !== 'workflow') continue;

      const instance = wrapper.instance as BaseWorkflow;
      this.byClass.set(wrapper.metatype as Type, instance);

      // Index by class name (for lookup by className from WorkflowEntity)
      this.byName.set(wrapper.metatype.name, instance);

      // Index by auto-derived snake_case identifier
      this.byName.set(deriveWorkflowIdentifier(wrapper.metatype.name), instance);

      // Also index by @Workflow({ name }) if provided (takes precedence)
      const config = getBlockConfig(wrapper.metatype);
      if (config && typeof config === 'object' && 'name' in config && typeof config.name === 'string') {
        this.byName.set(config.name, instance);
      }
    }

    this.logger.log(`Registered ${this.byClass.size} workflow(s): ${[...this.byName.keys()].join(', ')}`);
  }

  /**
   * Get a workflow singleton by class reference.
   */
  get<T extends BaseWorkflow>(workflowClass: Type<T>): T {
    const workflow = this.byClass.get(workflowClass);
    if (!workflow) {
      throw new Error(`Workflow ${workflowClass.name} not registered. Is it listed in a module's providers?`);
    }
    return workflow as T;
  }

  /**
   * Get a workflow singleton by name (class name or @Workflow({ name })).
   */
  getByName(name: string): BaseWorkflow {
    const workflow = this.byName.get(name);
    if (!workflow) {
      throw new Error(`Workflow "${name}" not registered. Available: ${[...this.byName.keys()].join(', ') || 'none'}`);
    }
    return workflow;
  }

  /**
   * Get all registered workflow singletons.
   */
  getAll(): BaseWorkflow[] {
    return [...this.byClass.values()];
  }

  /**
   * Check if a workflow is registered by class reference.
   */
  has(workflowClass: Type): boolean {
    return this.byClass.has(workflowClass);
  }
}
