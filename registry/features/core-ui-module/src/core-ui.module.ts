import { Module } from '@nestjs/common';
import { CommonModule, LoopCoreModule } from '@loopstack/core';
import { ErrorDocument, LinkDocument, MarkdownDocument, MessageDocument, PlainDocument } from './documents';
import { CreateDocument } from './tools';
import { TestUiDocumentsWorkflow } from './workflows';

@Module({
  imports: [CommonModule, LoopCoreModule],
  providers: [
    // Tools
    CreateDocument,

    // Documents
    ErrorDocument,
    MarkdownDocument,
    MessageDocument,
    PlainDocument,
    LinkDocument,

    // Workflows
    TestUiDocumentsWorkflow,
  ],
  exports: [
    CreateDocument,
    ErrorDocument,
    MarkdownDocument,
    MessageDocument,
    PlainDocument,
    LinkDocument,
    TestUiDocumentsWorkflow,
  ],
})
export class CoreUiModule {}
