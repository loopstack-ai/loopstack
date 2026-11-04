import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude';
import { ClaudeToolsModule } from '@loopstack/claude-tools';
import { StudioApp } from '@loopstack/common';
import { NativeSearchExampleWorkflow } from './workflows/native-search/native-search-example.workflow';
import { SearchStepExampleWorkflow } from './workflows/search-step/search-step-example.workflow';

const WORKFLOWS = [NativeSearchExampleWorkflow, SearchStepExampleWorkflow];

@StudioApp({
  title: 'Web Search Examples',
  workflows: WORKFLOWS,
})
@Module({
  // ClaudeModule provides claude_native_web_search and the Claude provider; ClaudeToolsModule provides
  // claude_web_search_step.
  imports: [ClaudeModule, ClaudeToolsModule],
  providers: WORKFLOWS,
  exports: WORKFLOWS,
})
export class WebSearchExamplesModule {}
