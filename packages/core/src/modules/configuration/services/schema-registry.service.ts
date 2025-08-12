import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { ZodGeneratorService } from './zod-generator.service';

@Injectable()
export class SchemaRegistry {
  private logger = new Logger(SchemaRegistry.name);
  private zodSchemas: Map<string, z.ZodSchema> = new Map();

  constructor(private readonly zodGeneratorService: ZodGeneratorService) {}

  public addJSONSchema(key: string, jsonSchema: any): void {
    try {
      const zodSchema = this.zodGeneratorService.createZod(jsonSchema);
      this.zodSchemas.set(key, zodSchema);
    } catch (error) {
      throw new Error(
        `Failed to create zod schema for '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  public getZodSchema(path: string): z.ZodType | undefined {
    return this.zodSchemas.get(path);
  }

  public getSize() {
    return this.zodSchemas.size;
  }
}
