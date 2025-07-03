import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DynamicSchemaGeneratorService } from './dynamic-schema-generator.service';
import { ServiceRegistry } from './service-registry.service';
import { ConfigService } from '@nestjs/config';
import {
  ConfigSourceInterface,
  DocumentType, JSONSchemaConfigType,
  MainConfigSchema,
  MainConfigType,
  NamedCollectionItem,
  PipelineType,
  StateMachineHandlerType,
  ToolConfigType,
} from '@loopstack/shared';
import { ConfigProviderRegistry } from './config-provider.registry';
import { z } from 'zod';
import { SchemaRegistry } from './schema-registry.service';
import { JSONSchemaType } from 'ajv';

@Injectable()
export class ConfigurationService implements OnModuleInit {
  private logger = new Logger(ConfigurationService.name);

  registry: Map<string, Map<string, any>>;

  constructor(
    private configService: ConfigService,
    private serviceRegistry: ServiceRegistry,
    private configProviderRegistry: ConfigProviderRegistry,
    private mainSchemaGenerator: DynamicSchemaGeneratorService,
    private schemaRegistry: SchemaRegistry,
  ) {}

  onModuleInit() {
    const installTemplates = this.configService.get('installTemplates');
    if (!installTemplates) {
      return;
    }

    this.clear();

    this.configProviderRegistry.initialize();
    this.serviceRegistry.initialize();

    const appConfigs =
      this.configService.get<ConfigSourceInterface[]>('configs') ?? [];
    const moduleConfigs = this.configProviderRegistry.getConfigs();

    const configs = [...appConfigs, ...moduleConfigs];

    if (!configs) {
      return;
    }

    // parse configs and make basic schema validations
    for (const config of configs) {
      this.createFromConfig(config);
    }

    // validate each config file separately, so we can trace potential source of errors
    for (const config of configs) {
      this.validate(config);
    }

    // register custom schemas
    for (const tool of this.getAll<ToolConfigType>('tools')) {
      this.registerCustomSchema(`custom.tools.arguments.${tool.name}`, tool.parameters);
    }

    for (const document of this.getAll<DocumentType>('documents')) {
      this.registerCustomSchema(`custom.documents.content.${document.name}`, document.schema);
    }

    this.logger.debug(`Registered ${this.schemaRegistry.getSize()} custom schemas.`);
  }

  registerCustomSchema(key: string, schema: JSONSchemaConfigType) {
    if (schema) {
      this.schemaRegistry.addJSONSchema(key, schema);
    }
  }

  createDefaultConfig() {
    return new Map(
      Object.entries({
        workspaces: new Map(),
        pipelines: new Map(),
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
      const config: MainConfigType = this.mainSchemaGenerator
        .getSchema()
        .parse(source.config);
      Object.entries(config).forEach(([key, value]) => {
        this.updateConfig(key, value);
      });
    } catch (error) {
      this.handleConfigError(error, source.path);
    }
  }

  private createPipelineWorkspaceValidation(): z.ZodEffects<any, any, any> {
    return z.any().refine(
      (data: MainConfigType): boolean => {
        if (!data.pipelines) {
          return true;
        }
        return data.pipelines.every(
          (pipeline: PipelineType) =>
            !pipeline.hasOwnProperty('workspace') ||
            undefined !== this.get('workspaces', pipeline['workspace']),
        );
      },
      (data: MainConfigType) => {
        const invalidIndex =
          data.pipelines?.findIndex(
            (pipeline) =>
              !pipeline.hasOwnProperty('workspace') ||
              undefined !== this.get('workspaces', pipeline['workspace']),
          ) ?? -1;

        return {
          message: `pipeline references non-existent workspace.`,
          path: ['pipelines', invalidIndex, 'workspace'],
        };
      },
    );
  }

  private createWorkflowToolCallValidation(): z.ZodEffects<any, any, any> {
    return z.any().refine(
      (data: MainConfigType): boolean => {
        if (!data.workflows) {
          return true;
        }

        const toolCalls: string[] = data.workflows
          .map((wf) =>
            wf.type === 'stateMachine'
              ? wf.transitions?.map((h) => h.call?.map((call) => call.tool))
              : [],
          )
          .flat(2)
          .filter((toolName) => undefined !== toolName);

        return toolCalls.every(
          (toolName) => undefined !== this.get('tools', toolName),
        );
      },
      (data: MainConfigType) => {
        const toolCalls: string[] = data
          .workflows!.map((wf) =>
            wf.type === 'stateMachine'
              ? wf.transitions?.map((h) => h.call?.map((call) => call.tool))
              : [],
          )
          .flat(2)
          .filter((toolName) => undefined !== toolName);

        const errorItem = toolCalls.find(
          (toolName) => undefined === this.get('tools', toolName),
        ) as unknown as StateMachineHandlerType;

        return {
          message: `workflow handler references non-existent tool "${errorItem.tool}".`,
          path: ['workflows', 'handlers'],
        };
      },
    );
  }

  validate(source: ConfigSourceInterface): any {
    try {
      this.mainSchemaGenerator
        .getSchema()
        .and(this.createPipelineWorkspaceValidation())
        .and(this.createWorkflowToolCallValidation())
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
      error.errors.forEach((validationError) => {
        this.logger.error(`Validation error: ${validationError.message}`);

        this.logger.debug(validationError);
      });

      throw new Error(
        `Configuration validation failed. Found ${error.errors.length} validation error(s) in file ${sourcePath}`,
      );
    }

    this.logger.error('Unexpected error during configuration parsing:', error);
    throw new Error(`Unexpected configuration error in file: ${sourcePath}`);
  }
}
