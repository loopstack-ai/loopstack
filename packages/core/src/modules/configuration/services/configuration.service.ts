import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DynamicSchemaGeneratorService } from './dynamic-schema-generator.service';
import { ConfigService } from '@nestjs/config';
import {
  ConfigSourceInterface,
  DocumentType,
  JSONSchemaConfigType,
  MainConfigType,
  ConfigElement,
  ToolConfigType, TaskInitializationEvent,
} from '@loopstack/shared';
import { ConfigProviderRegistry } from './config-provider.registry';
import { z } from 'zod';
import { SchemaRegistry } from './schema-registry.service';
import { HandlerRegistry } from './handler-registry.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

type ConfigElementMap = Map<string, ConfigElement<any>>;

@Injectable()
export class ConfigurationService implements OnApplicationBootstrap {
  private logger = new Logger(ConfigurationService.name);

  registry: Map<string, Map<string, ConfigElement<any>>>;

  constructor(
    private configService: ConfigService,
    private handlerRegistry: HandlerRegistry,
    private configProviderRegistry: ConfigProviderRegistry,
    private mainSchemaGenerator: DynamicSchemaGeneratorService,
    private schemaRegistry: SchemaRegistry,
    private eventEmitter: EventEmitter2,
  ) {}

  onApplicationBootstrap() {
    const installTemplates = this.configService.get('installTemplates');
    if (!installTemplates) {
      return;
    }

    this.clear();

    this.configProviderRegistry.initialize();
    this.handlerRegistry.initialize();

    const appConfigs =
      this.configService.get<ConfigSourceInterface[]>('configs') ?? [];
    const moduleConfigs = this.configProviderRegistry.getConfigs();

    const configSources: ConfigSourceInterface[] = [
      ...appConfigs,
      ...moduleConfigs,
    ].filter((config) => !!config.config);

    if (!configSources.length) {
      return;
    }

    // validate each config file separately, so we can trace potential source of errors
    for (const config of configSources) {
      this.validate(config);
    }

    // build a config file lookup table
    const configSourcesElements: Map<
      string,
      {
        path: string;
        items: ConfigElementMap;
        include: string[];
      }
    > = new Map([]);

    for (const config of configSources) {
      const { include, items } = this.createFromConfig(config);
      const itemsMap: ConfigElementMap = new Map(
        items.map((element) => [element.name, element]),
      );

      configSourcesElements.set(config.relativePath, {
        path: config.relativePath,
        items: itemsMap,
        include,
      });
    }

    // process imports for each file:
    const flatConfigElementMap: Map<string, ConfigElement<any>> = new Map([]);
    for (const file of Array.from(configSourcesElements.values())) {
      const { items, include } = file;

      const importMap = new Map<string, string>([]);

      // add imports to the importMap
      for (const includePath of include) {
        const importSource = configSourcesElements.get(includePath);
        if (importSource) {
          for (const importSourceElement of Array.from(
            importSource.items.values(),
          )) {
            importMap.set(importSourceElement.name, importSourceElement.path);
          }
        }
      }

      // add own items to the importMap
      for (const item of items.values()) {
        importMap.set(item.name, item.path);
      }

      // add the import map to each item
      // and add them to the global list of elements
      for (const item of items.values()) {
        item.importMap = importMap;
        flatConfigElementMap.set(`${item.path}:${item.name}`, item);
      }
    }

    // register the elements
    for (const [globalName, configElement] of Array.from(
      flatConfigElementMap.entries(),
    )) {
      this.registerConfig(globalName, configElement);
    }

    // register custom schemas
    for (const tool of this.getAll<ToolConfigType>('tools')) {
      this.registerCustomSchema(
        `${tool.name}.arguments`,
        tool.config.parameters,
      );
    }

    for (const document of this.getAll<DocumentType>('documents')) {
      this.registerCustomSchema(
        `${document.name}.content`,
        document.config.schema,
      );
    }

    this.logger.debug(
      `Registered ${this.schemaRegistry.getSize()} custom schemas.`,
    );

    const tasksInitPayload: TaskInitializationEvent = {
      tasks: [{
        id: 'test',
        metadata: {
          workspaceId: 'test',
          rootPipelineId: 'test',
          name: 'test',
          type: 'delayed',
          payload: {
            test: 'is a payload'
          }
        },
        options: {
          repeat: {
            every: 5000
          },
        }
      }]
    };
    this.eventEmitter.emit('tasks.initialize', tasksInitPayload)
  }

  private registerCustomSchema(key: string, schema: JSONSchemaConfigType) {
    if (schema) {
      this.schemaRegistry.addJSONSchema(key, schema);
    }
  }

  private createDefaultConfig() {
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

  private clear() {
    this.registry = this.createDefaultConfig();
  }

  private registerConfig(
    globalName: string,
    configElement: ConfigElement<any>,
  ) {
    const type = configElement.type;

    if (!this.registry.has(type)) {
      this.registry.set(type, new Map());
    }

    const config = this.registry.get(type)!;

    if (config.has(globalName)) {
      throw new Error(`item with name "${globalName}" already exists.`);
    }

    config.set(globalName, configElement);
  }

  has(registry: string, name: string): boolean {
    const config = this.registry.get(registry);
    if (!config) {
      return false;
    }

    return config.has(name);
  }

  getAll<T>(registry: string): ConfigElement<T>[] {
    const itemMap = this.registry.get(registry);
    return Array.from(itemMap?.values() ?? []);
  }

  get<T>(registry: string, searchKey: string): ConfigElement<T> | undefined {
    const config = this.registry.get(registry);
    if (!config) {
      throw new Error(`Registry with name ${registry} not found`);
    }

    return config.get(searchKey) as ConfigElement<T>;
  }

  resolveConfig<T>(
    type: string,
    name: string,
    includes: Map<string, string>,
  ): ConfigElement<T> {
    const resolvedName = this.resolveConfigName(name, includes);
    const configElement = this.get<T>(type, resolvedName);

    if (!configElement) {
      throw new Error(`Config for ${resolvedName} not found.`);
    }

    return configElement;
  }

  private resolveConfigName(name: string, includes: Map<string, string>) {
    const resolvedPath = includes.get(name);
    if (resolvedPath) {
      return `${resolvedPath}:${name}`;
    }

    return name;
  }

  private createFromConfig(source: ConfigSourceInterface): {
    include: string[];
    items: ConfigElement<any>[];
  } {
    try {
      const config: MainConfigType = this.mainSchemaGenerator
        .getSchema()
        .parse(source.config);

      const { include, ...cleanConfig } = config;

      const items = Object.entries(cleanConfig)
        .map(([key, data]) => {
          return data.map(
            (item: any) =>
              ({
                name: item.name,
                path: source.relativePath,
                type: key,
                importMap: new Map(),
                config: item,
              }) as ConfigElement<any>,
          );
        })
        .flat();

      return {
        items,
        include: include ?? [],
      };
    } catch (error) {
      this.handleConfigError(error, source.path);
    }
  }

  private validate(source: ConfigSourceInterface): any {
    try {
      this.mainSchemaGenerator.getSchema().parse(source.config);
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
