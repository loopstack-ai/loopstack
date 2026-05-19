import { Injectable } from '@nestjs/common';
import { toJSONSchema } from 'zod';
import {
  ServerTool,
  ToolInterface,
  WorkflowInterface,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockConfigSchema,
  resolveBlockTool,
  resolveInjectToolDefaults,
} from '@loopstack/common';
import type { WorkflowType } from '@loopstack/contracts/types';
import type { LlmResolvedTool } from '../types/index.js';

/**
 * Resolves tool definitions in a provider-agnostic format.
 *
 * Extracts tool names, descriptions, and JSON Schema input schemas from the
 * parent workflow and workspace. Each LLM provider converts these to its
 * native tool format (Anthropic.Tool, OpenAI function definitions, etc.).
 *
 * Server-side tools (extending {@link ServerTool}) are resolved separately —
 * their provider-native config is returned as-is for the provider to include
 * directly in the API call.
 */
@Injectable()
export class LlmToolsHelperService {
  getTools(tools: string[], parent: WorkflowInterface, workspace?: object): LlmResolvedTool[] {
    const resolved: LlmResolvedTool[] = [];

    for (const toolName of tools) {
      const tool = resolveBlockTool<ToolInterface | ServerTool>(parent, toolName, workspace);
      if (!tool) {
        throw new Error(`Tool with name ${toolName} not available in Workflow or Workspace context.`);
      }

      if (tool instanceof ServerTool) {
        const defaults = resolveInjectToolDefaults(parent, toolName, workspace);
        const configSchema = getBlockConfigSchema(tool);
        const validConfig =
          configSchema && defaults ? (configSchema.parse(defaults) as Record<string, unknown>) : defaults;
        resolved.push({ type: 'server_tool', name: toolName, config: tool.toServerToolConfig(validConfig) });
        continue;
      }

      const inputSchema = getBlockArgsSchema(tool);
      const config = getBlockConfig<WorkflowType>(tool);
      if (!config) {
        throw new Error(`Block ${tool.constructor.name} is missing @BlockConfig decorator`);
      }

      const jsonSchema = inputSchema ? (toJSONSchema(inputSchema) as Record<string, unknown>) : { type: 'object' };

      resolved.push({
        type: 'tool',
        name: toolName,
        description: config.description ?? '',
        inputSchema: jsonSchema,
      });
    }

    return resolved;
  }
}
