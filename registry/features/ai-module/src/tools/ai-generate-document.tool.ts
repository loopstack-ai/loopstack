import { BaseTool, InjectTool, Input, Tool, ToolResult } from '@loopstack/common';
import { AiGenerateObject, AiGenerateObjectArgsType, AiGenerateObjectSchema } from './ai-generate-object.tool';

@Tool({
  config: {
    description: 'Generates a structured object using a LLM and creates it as document',
  },
})
export class AiGenerateDocument extends BaseTool {
  @InjectTool() private aiGenerateObject!: AiGenerateObject;

  @Input({
    schema: AiGenerateObjectSchema,
  })
  args: AiGenerateObjectArgsType;

  async run(args: AiGenerateObjectArgsType): Promise<ToolResult> {
    const generateResult = await this.aiGenerateObject.run(args);
    const entity = await args.response.document.create({
      id: args.response.id,
      validate: 'strict',
      content: generateResult.data as unknown,
    });

    return {
      data: entity,
      metadata: generateResult.metadata,
    };
  }
}
