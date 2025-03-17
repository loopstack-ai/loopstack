import { z, ZodType } from 'zod';
import { Injectable } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';
import { ActionRegistry } from './action-registry.service';
import { AdapterRegistry } from './adapter-registry.service';
import { MainBaseSchema } from '../schemas/main.schema';
import { ServiceWithSchemaInterface } from '../../processor/interfaces/service-with-schema.interface';
import { ServiceConfigSchema } from '../schemas/service-config.schema';

@Injectable()
export class DynamicSchemaGeneratorService {
    private schema: ZodType;

    constructor(
      private readonly toolRegistry: ToolRegistry,
      private readonly actionRegistry: ActionRegistry,
      private readonly adapterRegistry: AdapterRegistry,
    ) {}

    createDiscriminatedServiceType<T extends Record<string, ServiceWithSchemaInterface>>(
      entries: Array<[string, ServiceWithSchemaInterface]>
    ) {
        const configSchemas = entries.map(([ name, service ]) => ServiceConfigSchema.extend({
            service: z.literal(name),
            props: service.schema,
        }));

        return z.discriminatedUnion("service", configSchemas as any);
    }

    createDynamicSchema(): ReturnType<typeof MainBaseSchema.extend> {
        const toolConfigSchemas = this.createDiscriminatedServiceType(this.toolRegistry.getEntries());
        const actionConfigSchemas = this.createDiscriminatedServiceType(this.actionRegistry.getEntries());
        const adapterConfigSchemas = this.createDiscriminatedServiceType(this.adapterRegistry.getEntries());

        return MainBaseSchema.extend({
            tools: z.array(toolConfigSchemas).optional(),
            actions: z.array(actionConfigSchemas).optional(),
            adapters: z.array(adapterConfigSchemas).optional(),
        }).strict()
    }

    getSchema(): ZodType {
        if (!this.schema) {
            this.schema = this.createDynamicSchema();
        }
        return this.schema;
    }
}
