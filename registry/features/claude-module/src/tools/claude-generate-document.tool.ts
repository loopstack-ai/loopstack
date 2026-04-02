import { BaseTool, InjectTool, Input, Tool, ToolResult } from '@loopstack/common';
import {
  ClaudeGenerateObject,
  ClaudeGenerateObjectArgsType,
  ClaudeGenerateObjectSchema,
} from './claude-generate-object.tool';

@Tool({
  config: {
    description: 'Generates a structured object using the Anthropic Claude API and creates it as a document',
  },
})
export class ClaudeGenerateDocument extends BaseTool {
  @InjectTool() private claudeGenerateObject!: ClaudeGenerateObject;

  @Input({
    schema: ClaudeGenerateObjectSchema,
  })
  args: ClaudeGenerateObjectArgsType;

  async run(args: ClaudeGenerateObjectArgsType): Promise<ToolResult> {
    const generateResult = await this.claudeGenerateObject.run(args);
    const entity = await args.response.document.create({
      id: args.response.id,
      validate: 'skip',
      content: generateResult.data as unknown,
    });

    return {
      data: entity,
      metadata: generateResult.metadata,
    };
  }
}
