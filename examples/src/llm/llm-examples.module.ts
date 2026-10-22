import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude';
import { StudioApp } from '@loopstack/common';
import { OpenAiModule } from '@loopstack/openai';
import { WebModule } from '@loopstack/web';
import { CustomProviderExampleWorkflow } from './workflows/custom-provider/custom-provider-example.workflow';
import { EchoModule } from './workflows/custom-provider/echo/echo.module';
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
    CustomProviderExampleWorkflow,
    WebFetchExampleWorkflow,
  ],
})
@Module({
  imports: [ClaudeModule, OpenAiModule, WebModule, EchoModule],
  providers: [
    FileDocument,
    PromptExampleWorkflow,
    StructuredOutputExampleWorkflow,
    MultiProviderExampleWorkflow,
    CustomProviderExampleWorkflow,
    WebFetchExampleWorkflow,
  ],
  exports: [
    PromptExampleWorkflow,
    StructuredOutputExampleWorkflow,
    MultiProviderExampleWorkflow,
    CustomProviderExampleWorkflow,
    WebFetchExampleWorkflow,
  ],
})
export class LlmExamplesModule {}
