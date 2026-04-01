import { BaseTool, InjectTool, Input, Tool, ToolResult } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core';
import { AiGenerateObject, AiGenerateObjectArgsType, AiGenerateObjectSchema } from './ai-generate-object.tool';

@Tool({
  config: {
    description: 'Generates a structured object using a LLM and creates it as document',
  },
})
export class AiGenerateDocument extends BaseTool {
  @InjectTool() private aiGenerateObject!: AiGenerateObject;
  @InjectTool() private createDocument!: CreateDocument;

  @Input({
    schema: AiGenerateObjectSchema,
  })
  args: AiGenerateObjectArgsType;

  async run(args: AiGenerateObjectArgsType): Promise<ToolResult> {
    const generateResult = await this.aiGenerateObject.run(args);
    const documentResult = await this.createDocument.run({
      id: args.response.id,
      document: args.response.document,
      validate: 'strict',
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
