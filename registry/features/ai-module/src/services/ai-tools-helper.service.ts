import { Injectable } from '@nestjs/common';
import { getBlockArgsSchema, getBlockConfig, getBlockTool } from '@loopstack/common';
import { WorkflowType } from '@loopstack/contracts/dist/types';
import { ToolBase, WorkflowBase } from '@loopstack/core';

@Injectable()
export class AiToolsHelperService {
  getTools(tools: string[], parent: WorkflowBase): Record<string, any> | undefined {
    // using any instead of ToolSet bc ai sdk types have some nesting issue
    const toolDefinitions: Record<string, any> = {};

    for (const toolName of tools) {
      const tool = getBlockTool<ToolBase>(parent, toolName);
      if (!tool) {
        throw new Error(`Tool with name ${toolName} not available in Workflow context.`);
      }

      const inputSchema = getBlockArgsSchema(tool);

      const config = getBlockConfig<WorkflowType>(tool);
      if (!config) {
        throw new Error(`Block ${tool.name} is missing @BlockConfig decorator`);
      }

      if (inputSchema) {
        toolDefinitions[toolName] = {
          description: config.description,
          inputSchema,
        } as unknown; // using unknown bc ai sdk types have some nesting issue
      }
    }

    return Object.keys(toolDefinitions).length ? toolDefinitions : undefined;
  }
}
