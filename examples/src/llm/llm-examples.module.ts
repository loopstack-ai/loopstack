import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude';
import { StudioApp } from '@loopstack/common';
import { OpenAiModule } from '@loopstack/openai';
import { WebModule } from '@loopstack/web';
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
  imports: [ClaudeModule, OpenAiModule, WebModule],
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
