import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { ExampleWorkspace } from './example-workspace';
import { AiModule } from '@loopstack/ai-module';
import { PromptWorkflow } from './prompt-example/prompt.workflow';
import { CoreToolsModule } from '@loopstack/core-tools-module';
import { CoreUiModule } from '@loopstack/core-ui-module';

@Module({
  imports: [
    LoopCoreModule,
    CoreUiModule,
    CoreToolsModule,
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

