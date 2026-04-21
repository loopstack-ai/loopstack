import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { ClaudeClientService, ClaudeMessagesHelperService, ClaudeToolsHelperService } from './services';
import {
  ClaudeGenerateDocument,
  ClaudeGenerateObject,
  ClaudeGenerateText,
  ClaudeWebSearch,
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
    ClaudeWebSearch,
    DelegateToolCalls,
    UpdateToolResult,
  ],
  exports: [
    ClaudeClientService,
    ClaudeMessagesHelperService,
    ClaudeToolsHelperService,

    ClaudeGenerateText,
    ClaudeGenerateObject,
    ClaudeGenerateDocument,
    ClaudeWebSearch,
    DelegateToolCalls,
    UpdateToolResult,
  ],
})
export class ClaudeModule {}
