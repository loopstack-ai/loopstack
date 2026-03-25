import { Injectable } from '@nestjs/common';
import { InjectDocument, InjectTool, Workflow } from '@loopstack/common';
import { CreateDocument, ErrorDocument, MarkdownDocument, MessageDocument, PlainDocument } from '@loopstack/core';

@Injectable()
@Workflow({
  config: {
    description: 'Test the displaying of core ui documents',
  },
  configFile: __dirname + '/test-ui-documents.workflow.yaml',
})
export class TestUiDocumentsWorkflow {
  @InjectTool() private createDocument: CreateDocument;
  @InjectDocument() private errorDocument: ErrorDocument;
  @InjectDocument() private markdownDocument: MarkdownDocument;
  @InjectDocument() private messageDocument: MessageDocument;
  @InjectDocument() private plainDocument: PlainDocument;
}
