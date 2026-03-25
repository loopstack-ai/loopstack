import { z } from 'zod';
import { ClaudeGenerateText, ClaudeMessageDocument, DelegateToolCalls } from '@loopstack/claude-module';
import { InjectDocument, InjectTool, Runtime, State, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core';
import { GetWeather } from './tools/get-weather.tool';

@Workflow({
  configFile: __dirname + '/tool-call.workflow.yaml',
})
export class ToolCallWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() getWeather: GetWeather;
  @InjectDocument() claudeMessageDocument: ClaudeMessageDocument;

  @State({
    schema: z.object({
      llmResult: z.any().optional(),
      delegateResult: z.any().optional(),
    }),
  })
  state: {
    llmResult?: any;
    delegateResult?: any;
  };

  @Runtime()
  runtime: any;
}
