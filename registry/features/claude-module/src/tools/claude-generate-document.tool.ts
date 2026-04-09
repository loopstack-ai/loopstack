import { BaseTool, InjectTool, Tool, ToolResult } from '@loopstack/common';
import {
  ClaudeGenerateObject,
  ClaudeGenerateObjectArgsType,
  ClaudeGenerateObjectSchema,
} from './claude-generate-object.tool';

@Tool({
  uiConfig: {
    description: 'Generates a structured object using the Anthropic Claude API and creates it as a document',
  },
  schema: ClaudeGenerateObjectSchema,
})
export class ClaudeGenerateDocument extends BaseTool {
  @InjectTool() private claudeGenerateObject!: ClaudeGenerateObject;

  async call(args: ClaudeGenerateObjectArgsType): Promise<ToolResult> {
    const generateResult = await this.claudeGenerateObject.call(args);
    const entity = await this.repository.save(args.response.document, generateResult.data as Record<string, unknown>, {
      id: args.response.id,
      validate: 'skip',
    });

    return {
      data: entity,
      metadata: generateResult.metadata,
    };
  }
}
