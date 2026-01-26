import { Injectable } from '@nestjs/common';
import { WorkflowBase } from '@loopstack/core';

@Injectable()
export class AiToolsHelperService {
  getTools(tools: string[], parent: WorkflowBase): Record<string, any> | undefined {
    // using any instead of ToolSet bc ai sdk types have some nesting issue
    const toolDefinitions: Record<string, any> = {};

    for (const toolName of tools) {
      const tool = parent.getTool(toolName);
      if (!tool) {
        throw new Error(`Tool with name ${toolName} not available in Workflow context.`);
      }

      const inputSchema = tool.argsSchema;

      if (inputSchema) {
        toolDefinitions[toolName] = {
          description: tool.config.description,
          inputSchema,
        } as unknown; // using unknown bc ai sdk types have some nesting issue
      }
    }

    return Object.keys(toolDefinitions).length ? toolDefinitions : undefined;
  }
}
