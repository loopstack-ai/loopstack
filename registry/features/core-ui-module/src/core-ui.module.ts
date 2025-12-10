import { Module } from '@nestjs/common';
import { CreateDocument } from './tools';
import {
  ErrorMessageDocument,
  MarkdownMessageDocument,
  MessageDocument,
  PlainMessageDocument,
} from './documents';
import { CreateChatMessage } from './tools';
import { CommonModule, LoopCoreModule } from '@loopstack/core';

@Module({
  imports: [
    CommonModule,
    LoopCoreModule,
  ],
  providers: [
    // Tools
    CreateDocument,
    CreateChatMessage,

    // Documents
    ErrorMessageDocument,
    MarkdownMessageDocument,
    MessageDocument,
    PlainMessageDocument,
  ],
  exports: [
    CreateChatMessage,
    CreateDocument,
  ],
})
export class CoreUiModule {}
