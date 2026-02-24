import {
  InjectTool,
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockTool,
} from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';
import { AiGenerateObject, AiGenerateObjectArgsType, AiGenerateObjectSchema } from './ai-generate-object.tool';

@Tool({
  config: {
    description: 'Generates a structured object using a LLM and creates it as document',
  },
})
export class AiGenerateDocument implements ToolInterface<AiGenerateObjectArgsType> {
  @InjectTool() private aiGenerateObject!: AiGenerateObject;
  @InjectTool() private createDocument!: CreateDocument;

  @Input({
    schema: AiGenerateObjectSchema,
  })
  args: AiGenerateObjectArgsType;

  private getRequiredTool(name: string): ToolInterface {
    const tool = getBlockTool<ToolInterface>(this, name);
    if (tool === undefined) {
      throw new Error(`Tool "${name}" is not available`);
    }
    return tool;
  }

  async execute(
    args: AiGenerateObjectArgsType,
    ctx: RunContext,
    parent: WorkflowInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const generateResult = await this.getRequiredTool('aiGenerateObject').execute(args, ctx, parent, metadata);
    const documentResult = await this.getRequiredTool('createDocument').execute(
      {
        id: args.response.id,
        document: args.response.document,
        update: {
          content: generateResult.data as unknown,
        },
      },
      ctx,
      parent,
      metadata,
    );

    return {
      ...documentResult,
      metadata: generateResult.metadata,
    };
  }
}
