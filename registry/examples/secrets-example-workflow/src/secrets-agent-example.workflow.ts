import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ClaudeDelegateToolCall,
  ClaudeGenerateText,
  ClaudeMessageDocument,
  ClaudeMessageDocumentContentType,
} from '@loopstack/claude-module';
import { InjectDocument, InjectTool, Runtime, State, Workflow } from '@loopstack/common';
import { TransitionPayload } from '@loopstack/contracts/dist/schemas';
import { CreateDocument, GetSecretKeysTool, RequestSecretsTool, SecretRequestDocument } from '@loopstack/core';

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
  @InjectTool() claudeDelegateToolCall: ClaudeDelegateToolCall;
  @InjectTool() requestSecrets: RequestSecretsTool;
  @InjectTool() getSecretKeys: GetSecretKeysTool;
  @InjectDocument() secretRequestDocument: SecretRequestDocument;
  @InjectDocument() claudeMessageDocument: ClaudeMessageDocument;

  @State({
    schema: z.object({
      delegateResult: z.any().optional(),
    }),
  })
  state: {
    delegateResult?: any;
  };

  @Runtime()
  runtime: {
    tools: {
      llm_turn: {
        llm_call: ClaudeMessageDocumentContentType;
      };
      route_with_tool_calls: {
        delegate: ClaudeMessageDocumentContentType;
      };
    };
    transition: TransitionPayload;
  };
}
