import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource, Repository, EntityTarget, EntityMetadata } from 'typeorm';
import { ObjectLiteral } from 'typeorm/common/ObjectLiteral';

export interface DynamicRepositoryOptions {
  /** Entity names to exclude from registration */
  blacklist?: string[];
}

@Injectable()
export class DynamicRepositoryService implements OnModuleInit {
  private readonly logger = new Logger(DynamicRepositoryService.name);
  private entityMap = new Map<string, EntityTarget<any>>();
  private metadataMap = new Map<string, EntityMetadata>();
  private options: Required<DynamicRepositoryOptions>;

  constructor(
    private readonly dataSource: DataSource,
    options: DynamicRepositoryOptions = {},
  ) {
    this.options = {
      blacklist: [],
      ...options,
    };
  }

  async onModuleInit() {
    await this.initializeEntityMap();
  }

  private async initializeEntityMap(): Promise<void> {
    try {
      // Ensure DataSource is initialized
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      const entities = this.dataSource.entityMetadatas;
      let registeredCount = 0;

      for (const metadata of entities) {
        const entityName = metadata.name;
        const targetName = metadata.targetName;

        // Check if entity is blacklisted
        if (this.isBlacklisted(entityName, targetName)) {
          continue;
        }

        // Store metadata for later use
        this.metadataMap.set(entityName, metadata);
        if (targetName !== entityName) {
          this.metadataMap.set(targetName, metadata);
        }

        // Register entity by entity name
        this.entityMap.set(entityName, metadata.target);

        // Register entity by class name if different
        if (targetName !== entityName) {
          this.entityMap.set(targetName, metadata.target);
        }

        registeredCount++;
      }

      this.logger.log(`Successfully registered ${registeredCount} entities`);
    } catch (error) {
      this.logger.error('Failed to initialize entity map', error);
      throw error;
    }
  }

  private isBlacklisted(entityName: string, targetName: string): boolean {
    const blacklist = this.options.blacklist;
    return blacklist.includes(entityName) || blacklist.includes(targetName);
  }

  /**
   * Get repository by entity name
   */
  getRepository<T extends ObjectLiteral>(entityName: string): Repository<T> {
    const entityTarget = this.entityMap.get(entityName);
    if (!entityTarget) {
      const availableEntities = this.getAvailableEntities();
      throw new Error(
        `Entity '${entityName}' not found. Available entities: ${availableEntities.join(', ')}`,
      );
    }
    return this.dataSource.getRepository(entityTarget);
  }

  /**
   * Check if entity exists
   */
  hasEntity(entityName: string): boolean {
    return this.entityMap.has(entityName);
  }

  /**
   * Get all available entity names
   */
  getAvailableEntities(): string[] {
    return Array.from(this.entityMap.keys()).sort();
  }

  /**
   * Get all registered entities with their metadata
   */
  getEntityInfo(): Array<{
    name: string;
    tableName: string;
    className: string;
    columns: string[];
  }> {
    return Array.from(this.entityMap.entries()).map(([name, target]) => {
      const metadata = this.metadataMap.get(name);
      return {
        name,
        tableName: metadata?.tableName || 'unknown',
        className: metadata?.targetName || 'unknown',
        columns: metadata?.columns.map((col) => col.propertyName) || [],
      };
    });
  }
}
