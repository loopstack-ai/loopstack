import { Injectable } from '@nestjs/common';
import { BlockConfig, Tool, ToolResult, WithArguments, getBlockTool } from '@loopstack/common';
import { ToolBase, WorkflowBase } from '@loopstack/core';
import { CreateDocument } from '@loopstack/core-ui-module';
import { WorkflowExecution } from '@loopstack/core/dist/workflow-processor/interfaces/workflow-execution.interface';
import { AiGenerateObject, AiGenerateObjectArgsType, AiGenerateObjectSchema } from './ai-generate-object.tool';

@Injectable()
@BlockConfig({
  config: {
    description: 'Generates a structured object using a LLM and creates it as document',
  },
})
@WithArguments(AiGenerateObjectSchema)
export class AiGenerateDocument extends ToolBase<AiGenerateObjectArgsType> {
  @Tool() private aiGenerateObject!: AiGenerateObject;
  @Tool() private createDocument!: CreateDocument;

  private getRequiredTool(name: string): ToolBase<any> {
    const tool = getBlockTool<ToolBase>(this, name);
    if (tool === undefined) {
      throw new Error(`Tool "${name}" is not available`);
    }
    return tool;
  }

  async execute(args: AiGenerateObjectArgsType, ctx: WorkflowExecution, parent: WorkflowBase): Promise<ToolResult> {
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
