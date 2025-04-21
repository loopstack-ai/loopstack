import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DynamicSchemaGeneratorService } from './dynamic-schema-generator.service';
import { AdapterRegistry } from './adapter-registry.service';
import { ToolRegistry } from './tool.registry';
import { ConfigService } from '@nestjs/config';
import { NamedCollectionItem } from '@loopstack/shared';

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
    this.registry = new Map();
  }

  onModuleInit() {
    const configs = this.configService.get('configs');
    this.init(configs);
  }

  clear() {
    this.registry = new Map();
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

  get<T>(registry: string, searchKey: string): T | undefined {
    const config = this.registry.get(registry);
    if (!config) {
      throw new Error(`Registry with name ${registry} not found`);
    }

    return config.get(searchKey) as T;
  }

  createFromConfig(data: any): any {
    const config = this.mainSchemaGenerator.getSchema().parse(data);

    const keys = Object.keys(config);
    for (const key of keys) {
      this.updateConfig(key, config[key]);
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
