import { z, ZodType } from 'zod';
import { Injectable } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';
import { AdapterRegistry } from './adapter-registry.service';
import { MainBaseSchema, ServiceConfigSchema } from '@loopstack/shared';
import { ServiceWithSchemaInterface } from '@loopstack/shared';

@Injectable()
export class DynamicSchemaGeneratorService {
  private schema: ZodType;

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly adapterRegistry: AdapterRegistry,
  ) {}

  createDiscriminatedServiceType<
    T extends Record<string, ServiceWithSchemaInterface>,
  >(entries: Array<[string, ServiceWithSchemaInterface]>) {
    const configSchemas = entries.map(([name, service]) =>
      ServiceConfigSchema.extend({
        service: z.literal(name),
        props: service.schema,
      }),
    );

    return z.discriminatedUnion('service', configSchemas as any);
  }

  createDynamicSchema(): ReturnType<typeof MainBaseSchema.extend> {
    const toolConfigSchemas = this.createDiscriminatedServiceType(
      this.toolRegistry.getEntries(),
    );
    const adapterConfigSchemas = this.createDiscriminatedServiceType(
      this.adapterRegistry.getEntries(),
    );

    return MainBaseSchema.extend({
      tools: z.array(toolConfigSchemas).optional(),
      adapters: z.array(adapterConfigSchemas).optional(),
    }).strict();
  }

  getSchema(): ZodType {
    if (!this.schema) {
      this.schema = this.createDynamicSchema();
    }
    return this.schema;
  }
}
