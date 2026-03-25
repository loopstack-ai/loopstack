import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ClaudeGenerateText,
  ClaudeMessageDocument,
  DelegateToolCalls,
  UpdateToolResult,
} from '@loopstack/claude-module';
import { InjectDocument, InjectTool, InjectWorkflow, Runtime, State, Workflow } from '@loopstack/common';
import { CreateDocument, GetSecretKeysTool, RequestSecretsTask, SecretsRequestWorkflow } from '@loopstack/core';

@Injectable()
@Workflow({
  config: {
    description: 'An agent workflow that autonomously manages secrets via LLM tool calling',
  },
  configFile: __dirname + '/secrets-agent-example.workflow.yaml',
})
export class SecretsAgentExampleWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() updateToolResult: UpdateToolResult;
  @InjectTool() requestSecrets: RequestSecretsTask;
  @InjectTool() getSecretKeys: GetSecretKeysTool;
  @InjectWorkflow() secretsRequest: SecretsRequestWorkflow;
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
