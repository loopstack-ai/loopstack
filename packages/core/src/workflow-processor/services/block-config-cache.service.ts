import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { toJSONSchema } from 'zod';
import {
  WorkflowInterface,
  buildWorkflowTransitions,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockTools,
  getBlockWorkflow,
  getBlockWorkflows,
  getDocumentSchema,
} from '@loopstack/common';
import { JSONSchemaDefinition } from '@loopstack/contracts/schemas';
import type {
  DocumentConfigType,
  ToolConfigType,
  WorkflowTransitionType,
  WorkflowType,
  WorkspaceType,
} from '@loopstack/contracts/types';
import { BlockDiscoveryService } from './block-discovery.service';

export interface CachedWorkflowConfig {
  alias: string;
  config: WorkflowType;
  transitions: WorkflowTransitionType[];
  argsSchema: z.ZodType | undefined;
  argsJsonSchema: JSONSchemaDefinition | undefined;
}

export interface CachedToolConfig {
  config: ToolConfigType;
  argsSchema: z.ZodType | undefined;
}

export interface CachedDocumentConfig {
  config: DocumentConfigType;
  schema: z.ZodType | undefined;
}

export interface CachedWorkspaceConfig {
  className: string;
  config: WorkspaceType;
  workflowNames: string[];
  resolvedUi: ResolvedWorkspaceUi | undefined;
}

export interface ResolvedWorkspaceUi {
  widgets: Record<string, unknown>[];
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type Constructor = Function & { prototype: object };

function getConstructor(target: object): Constructor {
  return (typeof target === 'function' ? target : target.constructor) as Constructor;
}

@Injectable()
export class BlockConfigCacheService implements OnModuleInit {
  private readonly logger = new Logger(BlockConfigCacheService.name);

  private readonly workflowConfigs = new Map<string, CachedWorkflowConfig>();
  private readonly workspaceConfigs = new Map<string, CachedWorkspaceConfig>();
  private readonly toolConfigs = new Map<Constructor, CachedToolConfig>();
  private readonly documentConfigs = new Map<Constructor, CachedDocumentConfig>();

  constructor(private readonly blockDiscoveryService: BlockDiscoveryService) {}

  onModuleInit() {
    this.cacheWorkflows();
    this.cacheWorkspaces();
    this.cacheTools();

    this.logger.log(
      `Cached config for ${this.workspaceConfigs.size} workspaces, ${this.workflowConfigs.size} workflows, ${this.toolConfigs.size} tools`,
    );
  }

  getWorkflowConfig(name: string): CachedWorkflowConfig | undefined {
    return this.workflowConfigs.get(name);
  }

  getAllWorkflowConfigs(): CachedWorkflowConfig[] {
    return [...this.workflowConfigs.values()];
  }

  getWorkspaceConfig(name: string): CachedWorkspaceConfig | undefined {
    return this.workspaceConfigs.get(name);
  }

  getAllWorkspaceConfigs(): CachedWorkspaceConfig[] {
    return [...this.workspaceConfigs.values()];
  }

  getToolConfig(target: object): CachedToolConfig | undefined {
    return this.toolConfigs.get(getConstructor(target));
  }

  getDocumentConfig(target: object): CachedDocumentConfig | undefined {
    const ctor = getConstructor(target);
    const cached = this.documentConfigs.get(ctor);
    if (cached) return cached;

    const config = getBlockConfig<DocumentConfigType>(target);
    if (!config) return undefined;

    const entry: CachedDocumentConfig = {
      config,
      schema: getDocumentSchema(target),
    };
    this.documentConfigs.set(ctor, entry);
    return entry;
  }

  private cacheWorkflows() {
    for (const workspace of this.blockDiscoveryService.getWorkspaces()) {
      const workflowNames = getBlockWorkflows(workspace);
      for (const name of workflowNames) {
        const instance = (workspace as Record<string, unknown>)[name] as WorkflowInterface | undefined;
        if (instance) {
          this.cacheWorkflow(name, instance);
        }
      }
    }

    for (const workflow of this.blockDiscoveryService.getAllWorkflows()) {
      const name = workflow.constructor.name;
      if (!this.workflowConfigs.has(name)) {
        this.cacheWorkflow(name, workflow);
      }
    }
  }

  private cacheWorkflow(alias: string, instance: WorkflowInterface) {
    if (this.workflowConfigs.has(alias)) return;

    const config = getBlockConfig<WorkflowType>(instance);
    if (!config) return;

    const decoratorTransitions = buildWorkflowTransitions(instance);
    const transitions = decoratorTransitions.length > 0 ? decoratorTransitions : (config.transitions ?? []);

    const argsSchema = getBlockArgsSchema(instance);
    const argsJsonSchema = argsSchema ? (toJSONSchema(argsSchema) as JSONSchemaDefinition) : undefined;

    this.workflowConfigs.set(alias, {
      alias,
      config,
      transitions,
      argsSchema,
      argsJsonSchema,
    });
  }

  private cacheWorkspaces() {
    for (const workspace of this.blockDiscoveryService.getWorkspaces()) {
      const className = workspace.constructor.name;
      const config = getBlockConfig<WorkspaceType>(workspace);
      if (!config) continue;

      const workflowNames = getBlockWorkflows(workspace);

      let resolvedUi: ResolvedWorkspaceUi | undefined;
      const uiWidgets = (config.ui as Record<string, unknown> | undefined)?.widgets as
        | Record<string, unknown>[]
        | undefined;

      if (uiWidgets?.length) {
        const resolvedWidgets = uiWidgets.map((widget) => {
          const options = widget.options as Record<string, unknown> | undefined;
          const workflowName = options?.workflow as string | undefined;
          if (!workflowName) return widget;

          const workflow = getBlockWorkflow<WorkflowInterface>(workspace, workflowName);
          if (!workflow) return widget;

          const cached = this.workflowConfigs.get(workflowName);

          return {
            ...widget,
            options: {
              ...options,
              schema: cached?.argsJsonSchema,
              workflowUi: cached?.config.ui,
            },
          };
        });
        resolvedUi = { widgets: resolvedWidgets };
      }

      this.workspaceConfigs.set(className, {
        className,
        config,
        workflowNames,
        resolvedUi,
      });
    }
  }

  private cacheTools() {
    const visited = new Set<Constructor>();

    const cacheToolsRecursive = (parent: object) => {
      const toolNames = getBlockTools(parent);
      for (const name of toolNames) {
        const tool = (parent as Record<string, unknown>)[name] as object | undefined;
        if (!tool) continue;

        const ctor = getConstructor(tool);
        if (visited.has(ctor)) continue;
        visited.add(ctor);

        const config = getBlockConfig<ToolConfigType>(tool);
        if (!config) continue;

        this.toolConfigs.set(ctor, {
          config,
          argsSchema: getBlockArgsSchema(tool),
        });

        cacheToolsRecursive(tool);
      }
    };

    for (const workflow of this.blockDiscoveryService.getAllWorkflows()) {
      cacheToolsRecursive(workflow);
    }

    for (const workspace of this.blockDiscoveryService.getWorkspaces()) {
      const workflowNames = getBlockWorkflows(workspace);
      for (const name of workflowNames) {
        const instance = (workspace as Record<string, unknown>)[name] as object | undefined;
        if (instance) {
          cacheToolsRecursive(instance);
        }
      }
    }
  }
}
