import { Injectable } from '@nestjs/common';
import { toJSONSchema } from 'zod';
import { BaseTool, ServerTool, getBlockArgsSchema, getBlockConfig, getBlockName } from '@loopstack/common';
import type { WorkflowType } from '@loopstack/contracts/types';
import type { LlmResolvedTool } from '../types/index.js';

/**
 * Resolves tool definitions in a provider-agnostic format.
 *
 * Accepts BaseTool[] instances and reads @Tool() decorator metadata to build
 * tool definitions for the LLM API. Each LLM provider converts these to its
 * native tool format (Anthropic.Tool, OpenAI function definitions, etc.).
 *
 * Server-side tools (extending {@link ServerTool}) are resolved separately —
 * their provider-native config is returned as-is for the provider to include
 * directly in the API call.
 */
@Injectable()
export class LlmToolsHelperService {
  /**
   * Build provider-agnostic tool definitions from BaseTool instances.
   *
   * @param tools — Tool instances (injected via constructor in the workflow)
   */
  getToolDefinitions(tools: BaseTool[]): LlmResolvedTool[] {
    const resolved: LlmResolvedTool[] = [];

    for (const tool of tools) {
      if (tool instanceof ServerTool) {
        // ServerTool: call toServerToolConfig() — config comes from module-level defaults
        const name = getBlockName(tool);
        resolved.push({ type: 'server_tool', name, config: tool.toServerToolConfig() });
        continue;
      }

      const inputSchema = getBlockArgsSchema(tool);
      const config = getBlockConfig<WorkflowType>(tool);
      if (!config) {
        throw new Error(`Block ${tool.constructor.name} is missing @Tool() decorator`);
      }

      const jsonSchema = inputSchema ? (toJSONSchema(inputSchema) as Record<string, unknown>) : { type: 'object' };
      const name = getBlockName(tool);

      resolved.push({
        type: 'tool',
        name,
        description: config.description ?? '',
        inputSchema: jsonSchema,
      });
    }

    return resolved;
  }

  /**
   * @deprecated Use getToolDefinitions() with BaseTool[] instead
   */
  getTools(_tools: string[], _parent: object, _workspace?: object): LlmResolvedTool[] {
    // Legacy fallback — kept for backwards compat during migration
    throw new Error(
      'getTools() with string[] is no longer supported. Use getToolDefinitions() with BaseTool[] instances.',
    );
  }
}
