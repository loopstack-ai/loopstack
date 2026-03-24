import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { ClaudeMessageDocument } from './documents';
import { ClaudeClientService, ClaudeMessagesHelperService, ClaudeToolsHelperService } from './services';
import { ClaudeDelegateToolCall, ClaudeGenerateDocument, ClaudeGenerateObject, ClaudeGenerateText } from './tools';

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
    ClaudeDelegateToolCall,

    // documents
    ClaudeMessageDocument,
  ],
  exports: [
    ClaudeGenerateText,
    ClaudeGenerateObject,
    ClaudeGenerateDocument,
    ClaudeDelegateToolCall,
    ClaudeMessageDocument,
  ],
})
export class ClaudeModule {}
