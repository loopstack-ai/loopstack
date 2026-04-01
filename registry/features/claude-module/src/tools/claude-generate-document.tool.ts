import { BaseTool, InjectTool, Input, Tool, ToolResult } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core';
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
  @InjectTool() private createDocument!: CreateDocument;

  @Input({
    schema: ClaudeGenerateObjectSchema,
  })
  args: ClaudeGenerateObjectArgsType;

  async run(args: ClaudeGenerateObjectArgsType): Promise<ToolResult> {
    const generateResult = await this.claudeGenerateObject.run(args);
    const documentResult = await this.createDocument.run({
      id: args.response.id,
      document: args.response.document,
      validate: 'skip',
      update: {
        content: generateResult.data as unknown,
      },
    });

    return {
      ...documentResult,
      metadata: generateResult.metadata,
    };
  }
}
