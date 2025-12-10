import { Injectable } from '@nestjs/common';
import {
  ToolResult,
  BlockConfig, WithArguments, Tool,
} from '@loopstack/common';
import { CreateDocument, ToolBase } from '@loopstack/core';
import { AiGenerateObject, AiGenerateObjectArgsType, AiGenerateObjectSchema } from './ai-generate-object.tool';
import { WorkflowExecution } from '@loopstack/core/dist/workflow-processor/interfaces/workflow-execution.interface';

@Injectable()
@BlockConfig({
  config: {
    description: "Generates a structured object using a LLM and creates it as document"
  }
})
@WithArguments(AiGenerateObjectSchema)
export class AiGenerateDocument extends ToolBase<AiGenerateObjectArgsType> {
  @Tool() aiGenerateObject: AiGenerateObject;
  @Tool() createDocument: CreateDocument;

  async execute(args: AiGenerateObjectArgsType, ctx: WorkflowExecution): Promise<ToolResult> {
    const result = await this.getTool('aiGenerateObject').execute(args, ctx);
    return this.getTool('createDocument').execute({
      document: args.responseDocument,
      update: {
        content: result.data,
      }
    }, ctx);
  }
}
