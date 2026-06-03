import { Injectable, Logger, OnApplicationBootstrap, Type } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { BLOCK_TYPE_METADATA_KEY, BaseWorkflow, getWorkflowIdentifier } from '@loopstack/common';

/**
 * Registry of all @Workflow() singletons, built at bootstrap via NestJS DiscoveryService.
 *
 * Three maps:
 * - `byClass`  — Type → instance (for type-safe lookups from WorkflowRunner)
 * - `byName`   — canonical identifier → instance (for string-based lookups)
 * - `nameOf`   — instance → canonical identifier (reverse lookup)
 *
 * The canonical identifier is `@Workflow({ name })` if provided,
 * otherwise the auto-derived snake_case from the class name (e.g. ChatWorkflow → 'chat').
 */
@Injectable()
export class WorkflowRegistryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkflowRegistryService.name);
  private readonly byClass = new Map<Type, BaseWorkflow>();
  private readonly byName = new Map<string, BaseWorkflow>();
  private readonly nameOf = new Map<BaseWorkflow, string>();

  constructor(private readonly discovery: DiscoveryService) {}

  onApplicationBootstrap(): void {
    const providers = this.discovery.getProviders();

    for (const wrapper of providers) {
      if (!wrapper.metatype || !wrapper.instance) continue;

      const blockType = Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, wrapper.metatype);
      if (blockType !== 'workflow') continue;

      const instance = wrapper.instance as BaseWorkflow;
      const canonicalName = getWorkflowIdentifier(wrapper.metatype);

      this.byClass.set(wrapper.metatype as Type, instance);
      this.byName.set(canonicalName, instance);
      this.nameOf.set(instance, canonicalName);
    }

    this.logger.log(`Registered ${this.byClass.size} workflow(s): ${[...this.byName.keys()].join(', ')}`);
  }

  /**
   * Resolve a class or canonical name to its instance and canonical name.
   */
  resolve(classOrName: Type | string): { instance: BaseWorkflow; workflowName: string } {
    if (typeof classOrName === 'string') {
      const instance = this.byName.get(classOrName);
      if (!instance) {
        throw new Error(
          `Workflow "${classOrName}" not registered. Available: ${[...this.byName.keys()].join(', ') || 'none'}`,
        );
      }
      return { instance, workflowName: classOrName };
    }

    const instance = this.byClass.get(classOrName);
    if (!instance) {
      throw new Error(`Workflow ${classOrName.name} not registered. Is it listed in a module's providers?`);
    }
    const workflowName = this.nameOf.get(instance)!;
    return { instance, workflowName };
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
