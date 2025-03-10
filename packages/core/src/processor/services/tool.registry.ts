import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { ToolInterface } from '../interfaces/tool.interface';
import { LOOP_TOOL_DECORATOR } from '../decorators/tool.decorator';
import { z, ZodObject, ZodType } from 'zod';

@Injectable()
export class ToolRegistry implements OnModuleInit {
  private tools: Map<string, ToolInterface> = new Map();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance = provider.instance;
      if (!instance || !instance.constructor) continue;

      const options = this.reflector.get<boolean>(
        LOOP_TOOL_DECORATOR,
        instance.constructor,
      );
      console.log(instance.constructor.name)

      if (options) {
        this.registerTool(instance);
      }
    }

    const schemas = this.getToolSchemas();
  }

  private registerTool(instance: ToolInterface) {
    const name = instance.constructor.name;

    if (this.tools.has(name)) {
      throw new Error(`Duplicate tool registration: "${name}"`);
    }

    this.tools.set(name, instance);
  }

  getToolByName(name: string): ToolInterface | undefined {
    return this.tools.get(name);
  }

  getToolSchemas(): ZodType[] {
    const schemas: ZodType[] = [];
    for (const [name, tool] of this.tools.entries()) {

      if (tool.argsSchema) {
        const toolSchema = z.object({
          tool: z.literal(name),
          args: tool.argsSchema,
        })

        // console.log(JSON.stringify(Object.entries(toolSchema.shape), null, 2));

        schemas.push(toolSchema);
      }
    }

    return schemas;
  }
}
