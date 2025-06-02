import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DynamicSchemaGeneratorService } from './dynamic-schema-generator.service';
import { AdapterRegistry } from './adapter-registry.service';
import { ToolRegistry } from './tool.registry';
import { ConfigService } from '@nestjs/config';
import { ConfigSourceInterface, MainConfigType, NamedCollectionItem, StateMachineHandlerType } from '@loopstack/shared';
import { ConfigProviderRegistry } from './config-provider.registry';
import { z } from 'zod';

@Injectable()
export class ConfigurationService implements OnModuleInit {
  private logger = new Logger(ConfigurationService.name);

  registry: Map<string, Map<string, any>>;

  constructor(
    private configService: ConfigService,
    private adapterRegistry: AdapterRegistry,
    private toolRegistry: ToolRegistry,
    private configProviderRegistry: ConfigProviderRegistry,
    private mainSchemaGenerator: DynamicSchemaGeneratorService,
  ) {}

  onModuleInit() {
    const installTemplates = this.configService.get('installTemplates');
    if (!installTemplates) {
      return;
    }

    this.clear();

    this.configProviderRegistry.initialize();
    this.adapterRegistry.initialize();
    this.toolRegistry.initialize();

    const appConfigs = this.configService.get<ConfigSourceInterface[]>('configs') ?? [];
    const moduleConfigs = this.configProviderRegistry.getConfigs();

    const configs = [
      ...appConfigs,
      ...moduleConfigs,
    ];

    if (!configs) {
      return
    }

    // parse configs and make basic schema validations
    for (const config of configs) {
      this.createFromConfig(config);
    }

    // validate each config file separately, so we can trace potential source of errors
    for (const config of configs) {
      this.validate(config);
    }

  }

  createDefaultConfig() {
    return new Map(
      Object.entries({
        workspaces: new Map(),
        projects: new Map(),
        workflows: new Map(),
        documents: new Map(),
        tools: new Map(),
        adapters: new Map(),
      }),
    );
  }

  clear() {
    this.registry = this.createDefaultConfig();
  }

  updateConfig(key: string, data: NamedCollectionItem[]) {
    if (!data || !Array.isArray(data)) {
      return;
    }

    if (!this.registry.has(key)) {
      this.registry.set(key, new Map());
    }

    const config = this.registry.get(key)!;

    for (const item of data) {
      if (config.has(item.name)) {
        throw new Error(`item with name "${item.name}" already exists.`);
      }

      config.set(item.name, item);
    }
  }

  has(registry: string, name: string): boolean {
    const config = this.registry.get(registry);
    if (!config) {
      return false;
    }

    return config.has(name);
  }

  getAll<T>(registry: string): T[] {
    const itemMap = this.registry.get(registry);
    return Array.from(itemMap?.values() ?? []);
  }

  get<T>(registry: string, searchKey: string): T | undefined {
    const config = this.registry.get(registry);
    if (!config) {
      throw new Error(`Registry with name ${registry} not found`);
    }

    return config.get(searchKey) as T;
  }

  createFromConfig(source: ConfigSourceInterface): any {
    try {
      const config: MainConfigType = this.mainSchemaGenerator.getSchema().parse(source.config);
      Object.entries(config).forEach(([key, value]) => {
        this.updateConfig(key, value);
      });
    } catch (error) {
      this.handleConfigError(error, source.path);
    }
  }

  private createProjectEntrypointValidation(): z.ZodEffects<any, any, any> {
    return z.any().refine(
      (data: MainConfigType): boolean => {
        if (!data.projects) {
          return true;
        }
        return data.projects.every(project =>
          undefined !== this.get('workflows', project.entrypoint)
        );
      },
      (data: MainConfigType) => {
        const invalidIndex = data.projects?.findIndex(project =>
          undefined === this.get('workspaces', project.workspace)
        ) ?? -1;

        return {
          message: `project references non-existent workflow.`,
          path: ["projects", invalidIndex, "entrypoint"]
        };
      }
    );
  }

  private createProjectWorkspaceValidation(): z.ZodEffects<any, any, any> {
    return z.any().refine(
      (data: MainConfigType): boolean => {
        if (!data.projects) {
          return true;
        }
        return data.projects.every(project =>
          undefined !== this.get('workspaces', project.workspace)
        );
      },
      (data: MainConfigType) => {
        const invalidIndex = data.projects?.findIndex(project =>
          undefined === this.get('workspaces', project.workspace)
        ) ?? -1;

        return {
          message: `project references non-existent workspace.`,
          path: ["projects", invalidIndex, "workspace"]
        };
      }
    );
  }

  private createWorkflowToolCallValidation(): z.ZodEffects<any, any, any> {
    return z.any().refine(
      (data: MainConfigType): boolean => {
        if (!data.workflows) {
          return true;
        }

        const toolCalls: string[] = data.workflows.map((wf) => wf.type === 'stateMachine' ? wf.handlers?.map((h) => h.call) : [])
          .flat()
          .filter((toolName) => undefined !== toolName);

        return toolCalls.every(toolName =>
          undefined !== this.get('tools', toolName)
        );
      },
      (data: MainConfigType) => {
        const items = data.workflows?.map(wf =>
          wf.type === 'stateMachine' && wf.handlers?.find((h) => undefined === this.get('tools', h.call))
        ) ?? [];

        const errorItem = items.flat().filter((i) => undefined !== i).shift() as StateMachineHandlerType;
        return {
          message: `workflow handler references non-existent tool "${errorItem.call}".`,
          path: ["workflows", "handlers"]
        };
      }
    );
  }

  private createWorkflowTemplateToolCallValidation(): z.ZodEffects<any, any, any> {
    return z.any().refine(
      (data: MainConfigType): boolean => {
        if (!data.workflowTemplates) {
          return true;
        }

        const stateMachineWorkflows = data.workflowTemplates.filter((wf) => wf.type === 'stateMachine');

        const templateIndex = stateMachineWorkflows.findIndex(wf =>
          wf.handlers && wf.handlers.find((handler) => !this.has('tools', handler.call))
        );

        return templateIndex === -1;
      },
      (data: MainConfigType) => {

        const stateMachineWorkflows = data.workflowTemplates!.filter((wf) => wf.type === 'stateMachine');

        const templateIndex = stateMachineWorkflows.findIndex(wf =>
          wf.handlers && wf.handlers.find((handler) => !this.has('tools', handler.call))
        );

        const handlerIndex = stateMachineWorkflows[templateIndex].handlers!.findIndex((handler) => !this.has('tools', handler.call));
        const wrongToolName = stateMachineWorkflows[templateIndex].handlers![handlerIndex].call;

        return {
          message: `state machine template handler references non-existent tool "${wrongToolName}".`,
          path: ["workflowTemplates", templateIndex, "handlers", handlerIndex, 'call']
        };
      }
    );
  }

  validate(source: ConfigSourceInterface): any {
    try {
      this.mainSchemaGenerator.getSchema()
        .and(this.createProjectEntrypointValidation())
        .and(this.createProjectWorkspaceValidation())
        .and(this.createWorkflowToolCallValidation())
        .and(this.createWorkflowTemplateToolCallValidation())
        // todo add more validations
        //   - state machine handler transition names
        //   - state machine template (extends) names
        //   - document names
        .parse(source.config);
    } catch (error) {
      this.handleConfigError(error, source.path);
    }
  }

  private handleConfigError(error: unknown, sourcePath: string): never {
    if (error instanceof z.ZodError) {
      error.errors.forEach(validationError => {
        this.logger.error(
          `Validation error: ${validationError.message}`
        );

        this.logger.debug(validationError);
      });

      throw new Error(
        `Configuration validation failed. Found ${error.errors.length} validation error(s) in file ${sourcePath}`
      );
    }

    this.logger.error('Unexpected error during configuration parsing:', error);
    throw new Error(`Unexpected configuration error in file: ${sourcePath}`);
  }
}
