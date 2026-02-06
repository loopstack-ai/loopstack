import { Injectable } from '@nestjs/common';
import {
  InjectTool,
  Tool,
  ToolInterface,
  ToolResult,
  WithArguments,
  WorkflowExecution,
  WorkflowInterface,
  getBlockTool,
} from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';
import { AiGenerateObject, AiGenerateObjectArgsType, AiGenerateObjectSchema } from './ai-generate-object.tool';

@Injectable()
@Tool({
  config: {
    description: 'Generates a structured object using a LLM and creates it as document',
  },
})
@WithArguments(AiGenerateObjectSchema)
export class AiGenerateDocument implements ToolInterface<AiGenerateObjectArgsType> {
  @InjectTool() private aiGenerateObject!: AiGenerateObject;
  @InjectTool() private createDocument!: CreateDocument;

  private getRequiredTool(name: string): ToolInterface {
    const tool = getBlockTool<ToolInterface>(this, name);
    if (tool === undefined) {
      throw new Error(`Tool "${name}" is not available`);
    }
    return tool;
  }

  async execute(
    args: AiGenerateObjectArgsType,
    ctx: WorkflowExecution<any>,
    parent: WorkflowInterface,
  ): Promise<ToolResult> {
    const result = await this.getRequiredTool('aiGenerateObject').execute(args, ctx, parent);
    return this.getRequiredTool('createDocument').execute(
      {
        id: args.response.id,
        document: args.response.document,
        update: {
          content: result.data as unknown,
        },
      },
      ctx,
      parent,
    );
  }
}
