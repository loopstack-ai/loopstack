import { Module } from '@nestjs/common';
import { CreateDocument } from './tools';
import {
  ErrorDocument,
  MarkdownDocument,
  MessageDocument,
  PlainDocument,
} from './documents';
import { CreateChatMessage } from './tools';
import { CommonModule, LoopCoreModule } from '@loopstack/core';
import { TestUiDocumentsWorkflow } from './workflows';

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
    ErrorDocument,
    MarkdownDocument,
    MessageDocument,
    PlainDocument,

    // Workflows
    TestUiDocumentsWorkflow
  ],
  exports: [
    CreateDocument,
    CreateChatMessage,
    ErrorDocument,
    MarkdownDocument,
    MessageDocument,
    PlainDocument,
    TestUiDocumentsWorkflow,
  ],
})
export class CoreUiModule {}
