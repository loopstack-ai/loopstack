import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { ToolInterface } from '../../processor/interfaces/tool.interface';
import { z, ZodType } from 'zod';
import { LOOP_TOOL_DECORATOR } from '../../processor';

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

      if (options) {
        this.registerTool(instance);
      }
    }
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

  getToolCallSchemas(): ZodType[] {
    const schemas: ZodType[] = [];
    for (const [name, tool] of this.tools.entries()) {

      if (tool.argsSchema) {
        const toolCallSchema = z.object({
          tool: z.literal(name),
          args: tool.argsSchema
        })
        schemas.push(toolCallSchema);
      }
    }

    return schemas;
  }
}
