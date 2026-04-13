import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { toJSONSchema } from 'zod';
import { ToolInterface, WorkflowInterface, getBlockArgsSchema, getBlockConfig } from '@loopstack/common';
import { getBlockTool } from '@loopstack/common';
import { WorkflowType } from '@loopstack/contracts/types';

@Injectable()
export class ClaudeToolsHelperService {
  getTools(tools: string[], parent: WorkflowInterface): Anthropic.Tool[] | undefined {
    const toolDefinitions: Anthropic.Tool[] = [];

    for (const toolName of tools) {
      const tool = getBlockTool<ToolInterface>(parent, toolName);
      if (!tool) {
        throw new Error(`Tool with name ${toolName} not available in Workflow context.`);
      }

      const inputSchema = getBlockArgsSchema(tool);
      const config = getBlockConfig<WorkflowType>(tool);
      if (!config) {
        throw new Error(`Block ${tool.constructor.name} is missing @BlockConfig decorator`);
      }

      const jsonSchema = inputSchema ? toJSONSchema(inputSchema) : { type: 'object' };

      toolDefinitions.push({
        name: toolName,
        description: config.description ?? '',
        input_schema: jsonSchema as Anthropic.Tool['input_schema'],
      });
    }

    return toolDefinitions.length ? toolDefinitions : undefined;
  }
}
