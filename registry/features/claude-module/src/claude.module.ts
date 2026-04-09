import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { ClaudeClientService, ClaudeMessagesHelperService, ClaudeToolsHelperService } from './services';
import {
  ClaudeGenerateDocument,
  ClaudeGenerateObject,
  ClaudeGenerateText,
  DelegateToolCalls,
  UpdateToolResult,
} from './tools';

@Module({
  imports: [LoopCoreModule],
  providers: [
    // services
    ClaudeClientService,
    ClaudeMessagesHelperService,
    ClaudeToolsHelperService,

    // tools
    ClaudeGenerateText,
    ClaudeGenerateObject,
    ClaudeGenerateDocument,
    DelegateToolCalls,
    UpdateToolResult,
  ],
  exports: [ClaudeGenerateText, ClaudeGenerateObject, ClaudeGenerateDocument, DelegateToolCalls, UpdateToolResult],
})
export class ClaudeModule {}
