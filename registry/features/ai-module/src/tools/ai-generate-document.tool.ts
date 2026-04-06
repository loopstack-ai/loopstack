import { BaseTool, InjectTool, Tool, ToolResult } from '@loopstack/common';
import { AiGenerateObject, AiGenerateObjectArgsType, AiGenerateObjectSchema } from './ai-generate-object.tool';

@Tool({
  uiConfig: {
    description: 'Generates a structured object using a LLM and creates it as document',
  },
  schema: AiGenerateObjectSchema,
})
export class AiGenerateDocument extends BaseTool {
  @InjectTool() private aiGenerateObject!: AiGenerateObject;

  async call(args: AiGenerateObjectArgsType): Promise<ToolResult> {
    const generateResult = await this.aiGenerateObject.call(args);
    const entity = await this.repository.save(args.response.document, generateResult.data as Record<string, unknown>, {
      id: args.response.id,
      validate: 'strict',
    });

    return {
      data: entity,
      metadata: generateResult.metadata,
    };
  }
}
