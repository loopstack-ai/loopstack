import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DynamicSchemaGeneratorService } from './dynamic-schema-generator.service';
import { AdapterRegistry } from './adapter-registry.service';
import { ToolRegistry } from './tool.registry';
import { ConfigService } from '@nestjs/config';
import { NamedCollectionItem } from '@loopstack/shared';
import { z } from 'zod';

@Injectable()
export class ConfigurationService implements OnModuleInit {
  private logger = new Logger(ConfigurationService.name);

  registry: Map<string, Map<string, any>>;

  constructor(
    private configService: ConfigService,
    private adapterRegistry: AdapterRegistry,
    private toolRegistry: ToolRegistry,

    private mainSchemaGenerator: DynamicSchemaGeneratorService,
  ) {
    this.clear();
  }

  onModuleInit() {
    const configs = this.configService.get('configs');
    this.init(configs);
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

  createFromConfig(data: any): any {
    try {
      const config = this.mainSchemaGenerator.getSchema().parse(data);
      const keys = Object.keys(config);
      for (const key of keys) {
        this.updateConfig(key, config[key]);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Enhanced error output that includes the invalid values
        const enhancedErrors = error.errors.map((err) => {
          // Get the path to the invalid value
          const path = err.path;

          // Extract the invalid value from your original data using the path
          const invalidValue = path.reduce(
            (obj, key) =>
              obj && typeof obj === 'object' ? obj[key] : undefined,
            data,
          );

          return {
            ...err,
            invalidValue, // Add the actual value that failed
          };
        });

        console.log(JSON.stringify(enhancedErrors, null, 2));
      }
      throw error;
    }
  }

  debug() {
    this.logger.debug(
      'Documents: ' +
        Array.from(this.registry.get('documents')?.keys()!).join(' '),
    );
    this.logger.debug(
      'Workflows: ' +
        Array.from(this.registry.get('workflows')?.keys()!).join(' '),
    );
    this.logger.debug(
      'Tools: ' + Array.from(this.registry.get('tools')?.keys()!).join(' '),
    );
  }

  init(configs: any[]) {
    this.clear();

    this.adapterRegistry.initialize();
    this.toolRegistry.initialize();
    if (configs) {
      for (const config of configs) {
        this.createFromConfig(config);
      }
    }

    // this.debug();
  }
}
