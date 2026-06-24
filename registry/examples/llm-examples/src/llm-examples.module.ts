import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { ClaudeToolsModule } from '@loopstack/claude-tools-module';
import { StudioApp } from '@loopstack/common';
import { OpenAiModule } from '@loopstack/openai-module';
import { WebModule } from '@loopstack/web-module';
import { MultiProviderExampleWorkflow } from './workflows/multi-provider/multi-provider-example.workflow';
import { PromptExampleWorkflow } from './workflows/prompt/prompt-example.workflow';
import { FileDocument } from './workflows/structured-output/documents/file-document';
import { StructuredOutputExampleWorkflow } from './workflows/structured-output/structured-output-example.workflow';
import { WebFetchExampleWorkflow } from './workflows/web-fetch/web-fetch-example.workflow';

@StudioApp({
  title: 'LLM Examples',
  workflows: [
    PromptExampleWorkflow,
    StructuredOutputExampleWorkflow,
    MultiProviderExampleWorkflow,
    WebFetchExampleWorkflow,
  ],
})
@Module({
  imports: [ClaudeModule, ClaudeToolsModule, OpenAiModule, WebModule],
  providers: [
    FileDocument,
    PromptExampleWorkflow,
    StructuredOutputExampleWorkflow,
    MultiProviderExampleWorkflow,
    WebFetchExampleWorkflow,
  ],
  exports: [
    PromptExampleWorkflow,
    StructuredOutputExampleWorkflow,
    MultiProviderExampleWorkflow,
    WebFetchExampleWorkflow,
  ],
})
export class LlmExamplesModule {}
