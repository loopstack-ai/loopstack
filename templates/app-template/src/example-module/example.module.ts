import { Module } from '@nestjs/common';
import { CoreFeaturesModule, LoopCoreModule } from '@loopstack/core';
import { ExampleWorkspace } from './example-workspace';
import { AiModule } from '@loopstack/ai-module';
import { PromptWorkflow } from './prompt-example/prompt.workflow';

@Module({
  imports: [
    LoopCoreModule,
    CoreFeaturesModule,
    AiModule,
  ],
  providers: [
    ExampleWorkspace,
    PromptWorkflow,
    // ChatWorkflow,
    //
    // PromptStructuredDataWorkflow,
    // FileDocument,
    //
    // GetWeather,
    // ToolCallWorkflow,
    //
    // MeetingNotesWorkflow,
    // MeetingNotesDocument,
    // OptimizedNotesDocument,
  ],
  exports: [
  ]
})
export class ExampleModule {}

