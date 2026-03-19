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
export class ClaudeGenerateDocument implements ToolInterface<ClaudeGenerateObjectArgsType> {
  @InjectTool() private claudeGenerateObject!: ClaudeGenerateObject;
  @InjectTool() private createDocument!: CreateDocument;

  @Input({
    schema: ClaudeGenerateObjectSchema,
  })
  args: ClaudeGenerateObjectArgsType;

  private getRequiredTool(name: string): ToolInterface {
    const tool = getBlockTool<ToolInterface>(this, name);
    if (tool === undefined) {
      throw new Error(`Tool "${name}" is not available`);
    }
    return tool;
  }

  async execute(
    args: ClaudeGenerateObjectArgsType,
    ctx: RunContext,
    parent: WorkflowInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const generateResult = await this.getRequiredTool('claudeGenerateObject').execute(args, ctx, parent, metadata);
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
